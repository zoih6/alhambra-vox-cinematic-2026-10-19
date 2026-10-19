"""Cinematic contact sheets and deterministic/continuity checks before encoding."""
from pathlib import Path
import json,time,hashlib,base64,io
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];TMP=Path('/home/user/.cache/alhambra-render/qa');TMP.mkdir(parents=True,exist_ok=True)
config=json.loads((R/'src/cinematic/timeline.json').read_text());errors=[];frames=[];timings=[]
with sync_playwright() as p:
 b=p.chromium.launch(args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 page=b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((R/'src/cinematic/index.html').as_uri());page.evaluate('()=>filmReady')
 assert page.evaluate('document.fonts.check(\'700 64px Alexandria\')')
 for s in config['scenes']:
  t=round(min(s['to']-.5,s['from']+max(1.8,(s['to']-s['from'])*.62))*32)/32
  start=time.monotonic();page.evaluate('(t)=>window.seek(t)',t)
  buf=page.screenshot(type='jpeg',quality=88)
  elapsed=time.monotonic()-start;timings.append(elapsed)
  file=TMP/f'scene-{s["id"]}.jpg';file.write_bytes(buf);frames.append((s,t,file));print('SCENE',s['id'],s['type'],f'{t:.3f}s',f'{elapsed:.3f}s/still',flush=True)
 # Non-sequential frame requests must yield byte-identical pixels.
 def digest(t):
  page.evaluate('(t)=>window.seek(t)',t)
  return hashlib.sha256(page.evaluate('document.getElementById("film").toDataURL("image/png")').encode()).hexdigest()
 a=digest(2.5);digest(144);z=digest(2.5);assert a==z
 # The virtual camera must not jump at 10-second render-file boundaries.
 jumps=[]
 for t in range(10,260,10):
  p0=page.evaluate('(t)=>Cinematic.camera(t)',t-1/32);p1=page.evaluate('(t)=>Cinematic.camera(t)',t)
  jumps.append(max(abs(p1[k]-p0[k]) for k in ['x','y','dolly']))
 assert max(jumps)<1
 # Benchmark a short warm sequence with the same API used by the production renderer.
 st=time.monotonic()
 for i in range(32):
  page.evaluate('(t)=>window.seek(t)',2+i/32);page.screenshot(type='jpeg',quality=92)
 fps=32/(time.monotonic()-st)
 b.close()
assert not errors,errors
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
for part in range(2):
 selection=frames[part*20:(part+1)*20];cw,ch=420,236;pad=14;label=41
 sheet=Image.new('RGB',(4*cw+5*pad,5*(ch+label+pad)+50),'#e4ddce');d=ImageDraw.Draw(sheet)
 d.text((14,12),f'CINEMATIC REVIEW {part+1}/2 — 32fps timeline — actual engine stills',font=font,fill='#20271e')
 for i,(s,t,pth) in enumerate(selection):
  im=Image.open(pth).resize((cw,ch),Image.Resampling.LANCZOS);x=pad+(i%4)*(cw+pad);y=50+(i//4)*(ch+label+pad)
  sheet.paste(im,(x,y));d.text((x+2,y+ch+8),f'{s["id"]}  {t:06.2f}s  {s["type"]}',font=font,fill='#20271e')
 sheet.save(R/f'research/cinematic-contact-{part+1}.jpg',quality=91,optimize=True)
report={'scene_count':len(frames),'js_errors':errors,'deterministic_seek':a==z,'camera_max_per_frame_boundary_step':max(jumps),'benchmark_capture_fps':round(fps,2),'first_frame_width':1920,'first_frame_height':1080,'stop_motion_fps':8,'camera_fps':32,'rack_focus':'continuous depth-dependent blur interpolation','motion_preview_requires_video_review':True}
(R/'research/cinematic-preflight.json').write_text(json.dumps(report,indent=2));print('CINEMATIC_PREFLIGHT',json.dumps(report),flush=True)
