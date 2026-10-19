"""Extend, rather than overwrite, the approved engine for singing, return junction and credits."""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1];D=R/'src/muwashah-v4';D.mkdir(parents=True,exist_ok=True)
mu=json.loads((D/'music-data.json').read_text());base=(R/'src/cinematic/engine.js').read_text();extra=(D/'music-extension.js').read_text()
# Keep source-v3 untouched. Only the new pages receive the additional cases and camera choreography.
cam=re.search(r'function camera\(t\)\{return\{[^\n]+',base).group(0)
base=base.replace(cam,cam.replace('function camera(t){','function camera(t){if(window.MUSIC_SECTION!==\'resume\')return musicCamera(t);',1))
base=base.replace("const waterTypes=new Set([","const waterTypes=new Set(['muwashah','credits-personal',",1)
base=base.replace('function sceneContent(g,cam,s,globalT){',extra+'\nfunction sceneContent(g,cam,s,globalT){',1)
base=base.replace('switch(s.type){',"switch(s.type){\n case 'muwashah':drawMuwashah(g,cam,t);break;\n case 'credits-personal':drawPersonalCredits(g,cam,t);break;",1)
base=base.replace('if(idx>0&&dt<.3125){',"if(idx>0&&dt<.3125&&!(window.MUSIC_SECTION==='resume'&&s.type==='poet')){",1)
bridge="""
function musicBridge(g,t){
 const mode=window.MUSIC_SECTION;
 if(mode==='music'&&t<.32&&A.bridgeIn){g.save();g.globalAlpha=1-smooth(t/.32);g.drawImage(A.bridgeIn,0,0,W,H);g.restore();}
 if(mode==='music'&&t>MU.music_duration-.35&&A.bridgeOut){g.save();g.globalAlpha=smooth((t-MU.music_duration+.35)/.35);g.drawImage(A.bridgeOut,0,0,W,H);g.restore();}
 if(mode==='credits'&&t<.32&&A.creditBridge){g.save();g.globalAlpha=1-smooth(t/.32);g.drawImage(A.creditBridge,0,0,W,H);g.restore();}
 if(mode==='credits'&&t>6.4){g.fillStyle=`rgba(7,12,9,${smooth((t-6.4)/.6)})`;g.fillRect(0,0,W,H);}
}
"""
base=base.replace('function draw(t){',bridge+'\nfunction draw(t){',1).replace('optics(g,cam,t);return{','optics(g,cam,t);musicBridge(g,t);return{',1)
(D/'engine.js').write_text(base)
assets=json.loads((R/'research/cinematic-asset-map.json').read_text())
for key,name in [('bridgeIn','muwashah-entry-v3.jpg'),('bridgeOut','muwashah-return-v4.jpg'),('creditBridge','muwashah-credit-entry-v3.jpg')]:
 p=R/'assets/cinematic'/name
 if p.exists():assets[key]=str(p.relative_to(R))
depth=json.loads((R/'research/cinematic-depth-assets.json').read_text());original=json.loads((R/'src/cinematic/timeline.json').read_text())
head='''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الحمراء — الموشح</title><style>@font-face{font-family:Alexandria;src:url('../../assets/fonts/Alexandria.ttf');font-weight:100 900;font-display:block}@font-face{font-family:Amiri;src:url('../../assets/fonts/Amiri-Regular.ttf');font-weight:400;font-display:block}*{box-sizing:border-box}html,body{margin:0;padding:0;overflow:hidden;background:#11180f}canvas{display:block;width:1920px;height:1080px}</style></head><body><canvas id="film" width="1920" height="1080"></canvas>'''
for mode in ['music','credits','resume']:
 if mode=='resume':config=original
 else:
  duration=mu['music_duration'] if mode=='music' else mu['credit_duration']
  config={'fps':32,'width':1920,'height':1080,'duration':duration,'duration_frames':round(duration*32),'scenes':[{'id':mode,'from':0,'to':duration,'type':'muwashah' if mode=='music' else 'credits-personal','focus':90,'title':'جادك الغيث' if mode=='music' else 'شذى ياسر'}]}
 script='<script>window.MUSIC_SECTION='+json.dumps(mode)+';window.MUWASHAH_DATA='+json.dumps(mu,ensure_ascii=False,separators=(',',':'))+';window.CINEMATIC_CONFIG='+json.dumps(config,ensure_ascii=False)+';window.CINEMATIC_DEPTH='+json.dumps(depth)+';window.CINEMATIC_ASSETS='+json.dumps({k:'../../'+p for k,p in assets.items()})+';window.CINEMATIC_MAP='+(R/'assets/iberia-map.geojson').read_text()+';window.CINEMATIC_ENVELOPE='+(R/'research/voice-envelope.json').read_text()+';</script>'
 (D/f'{mode}.html').write_text(head+script+'<script src="engine.js"></script></body></html>')
print('MUSIC_ENGINE_READY',mu['music_frames'],'singing frames; 224 credit frames; original camera retained for the narration return.')
