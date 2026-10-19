"""Assemble a local deterministic render entry point. No external services required to draw."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];D=R/'src/cinematic';D.mkdir(parents=True,exist_ok=True)
assets={'stone':'assets/cutouts/stone.webp','inscription':'assets/cutouts/inscription.webp','palace':'assets/cutouts/palace.webp','dawn':'assets/photos/palace-dawn.jpg','paper':'assets/textures/paper.jpg','charcoal':'assets/textures/charcoal.jpg','red':'assets/textures/red.jpg','myrtles':'assets/cinematic/myrtles.webp','dome':'assets/cinematic/dome.webp','lions':'assets/cinematic/lions.webp'}
depth=json.loads((R/'research/cinematic-depth-assets.json').read_text())
for name,m in depth['layers'].items():
 assets[name+'-backing']=m['backing']
 for lay in m['overlays']:assets[lay['key']]=lay['path']
for k,p in assets.items():assert (R/p).is_file(),(k,p)
config=json.loads((D/'timeline.json').read_text());env=json.loads((R/'research/voice-envelope.json').read_text()) if (R/'research/voice-envelope.json').exists() else []
head='''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الحمراء — محرك الفيلم السينمائي</title><style>@font-face{font-family:Alexandria;src:url('../../assets/fonts/Alexandria.ttf');font-weight:100 900;font-display:block}@font-face{font-family:Amiri;src:url('../../assets/fonts/Amiri-Regular.ttf');font-weight:400;font-display:block}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#11160f;overflow:hidden}canvas{display:block;width:1920px;height:1080px}</style></head><body><canvas id="film" width="1920" height="1080"></canvas>'''
script='<script>window.CINEMATIC_CONFIG='+json.dumps(config,ensure_ascii=False)+';window.CINEMATIC_DEPTH='+json.dumps(depth)+';window.CINEMATIC_ASSETS='+json.dumps({k:'../../'+p for k,p in assets.items()})+';window.CINEMATIC_MAP='+(R/'assets/iberia-map.geojson').read_text()+';window.CINEMATIC_ENVELOPE='+json.dumps(env,separators=(',',':'))+';</script>'
(D/'index.html').write_text(head+script+'<script src="engine.js"></script></body></html>')
(R/'research/cinematic-asset-map.json').write_text(json.dumps(assets,indent=2))
print('CINEMATIC_ENGINE_READY',len(config['scenes']),'scenes',config['duration_frames'],'frames',len(assets),'assets')
