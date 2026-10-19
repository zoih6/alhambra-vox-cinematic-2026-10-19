"""Export exactly eight approval stills and one static board. NEVER encodes video."""
from pathlib import Path
import base64,hashlib,json
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'preview';FR=D/'frames';FR.mkdir(exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((D/'frame-board.html').as_uri(),wait_until='load')
    page.evaluate('() => window.filmReady')
    assert page.evaluate('document.fonts.check(\'700 64px Alexandria\')'), 'Arabic UI font did not load'
    assert page.evaluate('document.fonts.check(\'400 64px Amiri\')'), 'Arabic display font did not load'
    shots=page.evaluate('FILM.shots')
    for s in shots:
        page.evaluate('(t)=>window.seek(t)',s['still']/32)
        data=page.evaluate('document.getElementById("film").toDataURL("image/png")')
        file=FR/f'frame-{s["id"]}.png';file.write_bytes(base64.b64decode(data.split(',')[1]))
        print(s['id'],s['still']/32,file.stat().st_size,flush=True)
    def frame_hash(frame):
        page.evaluate('(t)=>window.seek(t)',frame/32)
        return hashlib.sha256(page.evaluate('document.getElementById("film").toDataURL("image/png")').encode()).hexdigest()
    h1=frame_hash(86);frame_hash(800);h2=frame_hash(86)
    assert h1==h2,'Out-of-order seeks were not deterministic'
    assert page.evaluate('FILM.spring(-1) === 0 && FILM.spring(0) === 0 && Math.abs(FILM.spring(10)-1)<0.0001')
    assert shots[0]['from']==0 and shots[-1]['to']==960
    assert all(a['to']==b['from'] for a,b in zip(shots,shots[1:]))
    # Real interaction test: enlarge a still, then close it. No time-based playback.
    page.locator('[data-shot="01"]').click();assert 'open' in page.locator('#dialog').get_attribute('class')
    page.locator('#close-dialog').click();assert 'open' not in page.locator('#dialog').get_attribute('class')
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= 392'), 'Mobile horizontal overflow'
    page.screenshot(path=str(D/'mobile-layout-check.png'),full_page=False)
    browser.close()
assert not errors,errors
# Assemble a physical-style review board from the actual code-generated stills.
BW=2400;M=52;GAP=36;PW=(BW-2*M-GAP)//2;PH=round(PW*9/16);CAP=120;TOP=315;BOT=138
BH=TOP+4*(PH+CAP+GAP)+BOT-GAP
board=Image.new('RGB',(BW,BH),'#e8e1d2');d=ImageDraw.Draw(board)
def af(size,bold=False):
 f=ImageFont.truetype(str(ROOT/'assets/fonts/Alexandria.ttf'),size)
 if bold:
  try:f.set_variation_by_axes([650])
  except Exception:pass
 return f
def ar(s,x,y,font,fill='#242a24',anchor='ra'):
 d.text((x,y),s,font=font,fill=fill,direction='rtl',language='ar',anchor=anchor)
d.rectangle((0,0,BW,TOP-24),fill='#202420');d.rectangle((0,TOP-30,BW,TOP-24),fill='#ad3c2c')
ar('الحمراء | قصيدة من حجر',BW-M,20,ImageFont.truetype(str(ROOT/'assets/fonts/Amiri-Regular.ttf'),106),'#f1e9d7')
ar('لوحة الفريمات الأولية · أول ٣٠ ثانية · لا تصيير فيديو',BW-M,228,af(28),'#bfc3b6')
d.text((M,56),'A POEM IN STONE',font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',26),fill='#c97a61')
d.text((M,103),'16:9  /  1920 x 1080  /  32 FPS TIMELINE',font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18),fill='#bfc3b6')
for idx,s in enumerate(shots):
    # RTL reading order: first still is the top-right cell.
    col=1-(idx%2);row=idx//2;x=M+col*(PW+GAP);y=TOP+row*(PH+CAP+GAP)
    im=Image.open(FR/f'frame-{s["id"]}.png').convert('RGB').resize((PW,PH),Image.Resampling.LANCZOS)
    board.paste(im,(x,y));d.rectangle((x,y+PH,x+PW,y+PH+CAP),fill='#f4efe5')
    ar(s['title'],x+PW-25,y+PH+18,af(29,True))
    ar(s['voice'],x+PW-25,y+PH+67,af(21),fill='#69705f')
    d.text((x+22,y+PH+20),s['id'],font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',27),fill='#ad3c2c')
    d.text((x+22,y+PH+70),f'{s["still"]/32:05.2f}s',font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20),fill='#74786b')
y=BH-100
ar('من الحجر إلى النقش، ثم الزمن والخريطة والسماء والقصيدة.',BW-M,y,af(26,True))
ar('الحجر الافتتاحي مجاز بصري مولّد. صور القصر والنقش حقيقية. اللوحة لا تختبر سلاسة الحركة أو التزامن المسموع.',BW-M,y+49,af(20),fill='#74786b')
board.save(D/'first-30s-board.png',optimize=True)
checks={'static_only':True,'rendered_video_files':0,'frame_dimensions':[1920,1080],'timeline_fps':32,'sample_frames':len(shots),'timeline_frames':960,'deterministic_out_of_order_seek':h1==h2,'arabic_fonts_loaded':True,'mobile_no_horizontal_overflow':True,'zoom_controls_tested':True,'spring_boundary_checks':True,'js_errors':errors,'motion_playback_review':'not performed; approval stills only','audio_sync_review':'machine word candidates only; manual listening review pending'}
(ROOT/'research/preview-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print('STATIC_BOARD_OK',D/'first-30s-board.png',board.size)
