"""Whole-film v5 visual preflight, plus independently timed typography proof strips."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,io,time,csv
R=Path(__file__).resolve().parents[1];D=R/'src/layered-v5';TMP=Path('/home/user/.cache/alhambra-render/layered-v5/qa');TMP.mkdir(parents=True,exist_ok=True)
C=json.loads((D/'layer-plan.json').read_text());M=json.loads((D/'chorus-data.json').read_text());points=[]
for s in C['source_scenes']:
 if s['type'] in ['verse','credits']:continue
 t=min(s['to']-.25,s['from']+(s['to']-s['from'])*.84)
 if s['type']=='founder':t=59.0
 full=t if t<C['narration_cut_in'] else t+C['narration_tail_offset'];points.append((s['id'],s['type'],full))
for l in M['lines']:
 t=min(l['until']-.12,l['words'][-1]['end']+.08);points.append(('M'+str(l['id']+1).zfill(2),l['world'],C['narration_cut_in']+t))
points.append(('C5','personal-credit',C['credits_start']+5.8));points.sort(key=lambda a:a[2]);frames=[];errors=[];audit=[]
with sync_playwright() as p:
 b=p.chromium.launch(args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']);pg=b.new_page(viewport={'width':1920,'height':1080});pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto((D/'index.html').as_uri());pg.evaluate('()=>filmReady')
 for sid,name,t in points:
  t=round(t*32)/32;meta=pg.evaluate('(t)=>seek(t)',t);buf=pg.screenshot(type='jpeg',quality=91);frames.append((sid,name,t,Image.open(io.BytesIO(buf)).copy()));(TMP/f'scene-{sid}.jpg').write_bytes(buf);audit.append({'scene':sid,'sample_time':t,'inspection':pg.evaluate('LayeredV5.inspect()')});print('V5_SCENE_CHECK',sid,name,meta['layers'],flush=True)
 # These sequences expose masked bodies/dots, not merely final compositions.
 proof=[]
 for t in [.3,.6,.9,1.2,1.6,50.95,51.35,52.0,C['credits_start']+.4,C['credits_start']+1.1,C['credits_start']+2.1,C['credits_start']+3.4]:
  pg.evaluate('(t)=>seek(t)',t);proof.append((t,Image.open(io.BytesIO(pg.screenshot(type='jpeg',quality=91))).copy()))
 def pixel(t):return hashlib.sha256(pg.evaluate('(t)=>{seek(t);return document.getElementById("film").toDataURL("image/png")}',t).encode()).hexdigest()
 a=pixel(52.0);pixel(185);bb=pixel(52.0);assert a==bb
 assert pg.evaluate('LayeredV5.groupEntranceTransforms') is False
 b.close()
assert not errors,errors
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for page in range(4):
 part=frames[page*16:(page+1)*16]
 if not part:continue
 rows=(len(part)+3)//4;sheet=Image.new('RGB',(1740,rows*280+10),'#e4ddce');g=ImageDraw.Draw(sheet)
 for i,(sid,name,t,im) in enumerate(part):
  im.thumbnail((420,236));x=10+(i%4)*435;y=10+(i//4)*280;sheet.paste(im,(x,y));g.text((x+3,y+241),f'{sid} | {t:.2f}s | {name}',font=font,fill='#20271e')
 sheet.save(R/f'research/v5-all-scenes-{page+1}.jpg',quality=89,optimize=True)
sheet=Image.new('RGB',(1740,850),'#e4ddce');g=ImageDraw.Draw(sheet)
for i,(t,im) in enumerate(proof):
 im.thumbnail((420,236));x=10+(i%4)*435;y=10+(i//4)*280;sheet.paste(im,(x,y));g.text((x+3,y+241),f't={t:.3f}s',font=font,fill='#20271e')
sheet.save(R/'research/v5-matte-progress-proof.jpg',quality=90,optimize=True)
(R/'research/v5-layer-audit.json').write_text(json.dumps(audit,ensure_ascii=False,separators=(',',':')))
report={'scenes_checked':len(frames),'javascript_errors':errors,'deterministic_seek':a==bb,'shared_parent_entrance_transforms':False,'text_shaping':'native joined Arabic, before body/dot mattes','paper_photo_shadow':'separate scheduled layers','legacy_full_frame_wipe':'removed from the active v5 engine','width':1920,'height':1080,'fps':32,'full_render_still_pending':True}
(R/'research/v5-preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('WHOLE_FILM_V5_PREFLIGHT_READY',json.dumps(report),flush=True)
