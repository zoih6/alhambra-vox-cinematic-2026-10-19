"""Compile v5 independent primitives and scene construction around the preserved v3 layouts."""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1];D=R/'src/layered-v5';C=json.loads((D/'layer-plan.json').read_text());M=json.loads((D/'chorus-data.json').read_text())
base=(R/'src/cinematic/engine.js').read_text()
def case_replace(pattern,new):
 global base
 updated,n=re.subn(pattern,new,base,count=1,flags=re.S)
 if n!=1:raise RuntimeError('Could not replace layout case: '+pattern)
 base=updated
case_replace(r"case 'inscription':.*?(?=\n case 'centuries':)","case 'inscription':drawInscriptionV5(g,cam,s,t);break;")
case_replace(r"case 'year':case 'fall':.*?(?=\n case 'founder':)","case 'year':case 'fall':drawDateV5(g,cam,s,t);break;")
case_replace(r"case 'founder':case 'poet':.*?(?=\n case 'foundation':)","case 'founder':drawFounderV5(g,cam,s,t);break;\n case 'poet':drawPoetV5(g,cam,s,t);break;")
case_replace(r"case 'foundation':.*?(?=\n case 'aqueduct':)","case 'foundation':drawFoundationV5(g,cam,s,t);break;")
case_replace(r"case 'aqueduct':case 'growth':.*?(?=\n case 'red':)","case 'aqueduct':case 'growth':drawWaterV5(g,cam,s,t);break;")
case_replace(r"case 'pool':.*?(?=\n case 'court':)","case 'pool':drawPoolV5(g,cam,s,t);break;")
case_replace(r"case 'rim':.*?(?=\n case 'dome':)","case 'rim':drawRimV5(g,cam,s,t);break;")
case_replace(r"case 'key':.*?(?=\n case 'sigh':)","case 'key':drawKeyV5(g,cam,s,t);break;")
def remove_function(text,name):
 start=text.find('function '+name+'(')
 if start<0:raise RuntimeError('Missing old primitive: '+name)
 brace=text.index('{',text.index(')',start)+1);depth=1;i=brace+1;quote=None;line_comment=False;block_comment=False
 while i<len(text) and depth:
  ch=text[i];nx=text[i:i+2]
  if line_comment:
   if ch=='\n':line_comment=False
  elif block_comment:
   if nx=='*/':block_comment=False;i+=1
  elif quote:
   if ch=='\\':i+=1
   elif ch==quote:quote=None
  elif nx=='//':line_comment=True;i+=1
  elif nx=='/*':block_comment=True;i+=1
  elif ch in ['\"',"'",'`']:quote=ch
  elif ch=='{':depth+=1
  elif ch=='}':depth-=1
  i+=1
 if depth:raise RuntimeError('Unbalanced old primitive '+name)
 return text[:start]+text[i:]
for old_primitive in ['camera','arabic','paper','trace','arch','imageLayer','object','label','tag','photoNode','cutNode','titleBlock','redThread','stage','mapGraphic','draw']:
 base=remove_function(base,old_primitive)
core=(D/'layer-core.js').read_text();scenes=(D/'layer-scenes.js').read_text()
base=base.replace('window.seek=draw;',core+'\n'+scenes+'\nwindow.seek=v5Draw;')
base=base.replace('draw(0);document.documentElement.dataset.ready', 'v5Draw(0);document.documentElement.dataset.ready')
(D/'engine.js').write_text('/* V5: legacy entrance transforms and global wipe renderer removed. Native independent-layer compositor below. */\n'+base)
assets=json.loads((R/'research/cinematic-asset-map.json').read_text());subjects=json.loads((R/'research/v5-cutout-manifest.json').read_text())
for key,rec in subjects['assets'].items():
 assets['v5-'+key]=rec['cutout']
 for layer in rec['layers']+rec.get('construction_parts',[]):assets['v5-'+layer['key']]=layer['path']
for k,v in assets.items():assert (R/v).exists(),(k,v)
head='''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الحمراء — البناء الطبقي</title><style>@font-face{font-family:Alexandria;src:url('../../assets/fonts/Alexandria.ttf');font-weight:100 900;font-display:block}@font-face{font-family:Amiri;src:url('../../assets/fonts/Amiri-Regular.ttf');font-weight:400;font-display:block}html,body{margin:0;overflow:hidden;background:#151b16}canvas{display:block;width:1920px;height:1080px}</style></head><body><canvas id="film" width="1920" height="1080"></canvas>'''
script='<script>window.CINEMATIC_CONFIG='+(R/'src/cinematic/timeline.json').read_text()+';window.CINEMATIC_DEPTH='+(R/'research/cinematic-depth-assets.json').read_text()+';window.CINEMATIC_ASSETS='+json.dumps({k:'../../'+p for k,p in assets.items()})+';window.CINEMATIC_MAP='+(R/'assets/iberia-map.geojson').read_text()+';window.CINEMATIC_ENVELOPE='+(R/'research/voice-envelope.json').read_text()+';window.LAYERED_V5='+json.dumps(C,ensure_ascii=False)+';window.V5_CHORUS='+json.dumps(M,ensure_ascii=False,separators=(',',':'))+';window.V5_SUBJECTS='+json.dumps(subjects)+';</script>'
(D/'index.html').write_text(head+script+'<script src="engine.js"></script></body></html>')
(R/'research/v5-render-asset-map.json').write_text(json.dumps(assets,indent=2))
print('LAYERED_V5_READY',C['total_frames'],'frames;',len(assets),'assets; native Arabic masks and independent element clocks.')
