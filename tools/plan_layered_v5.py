"""Author independent element timing and properties before rendering any v5 scene."""
from pathlib import Path
import json,csv,math
R=Path(__file__).resolve().parents[1];D=R/'src/layered-v5';D.mkdir(parents=True,exist_ok=True)
old=json.loads((R/'src/cinematic/timeline.json').read_text());CI=168.40625;CO=175.96875;SI=618.670;SO=690.000;MF=math.ceil((SO-SI)*32);MD=MF/32;DELTA=MD-(CO-CI);END=265.40625+DELTA+7
# Each role has its own clock, property set and easing, not an animated scene parent.
BASE={
 'backdrop':{'start':0,'duration':0,'depth':-580,'properties':['camera parallax only'],'before':'visible','during':'no decorative element motion','settled':'fixed world substrate'},
 'paper_shadow':{'start':0,'duration':1.25,'depth':35,'properties':['shadow offset','blur','density'],'before':'wide soft low-density shadow','during':'narrows as paper approaches its plane','settled':'12px optical offset'},
 'paper_mount':{'start':.08,'duration':.68,'depth':55,'properties':['custom torn-edge mask'],'before':'matte closed','during':'angled right-to-left peel','settled':'original mount geometry'},
 'photo':{'start':.30,'duration':1.05,'depth':90,'properties':['image-specific track matte'],'before':'hidden by matte','during':'independent reveal after mount','settled':'original crop and grading'},
 'title_shadow':{'start':.35,'duration':1.23,'depth':494.7,'properties':['independent blurred ink shadow matte'],'before':'masked','during':'follows the emerging ink without moving the title','settled':'soft contrast shadow'},
 'title_body':{'start':.32,'duration':1.08,'depth':495,'properties':['three-band shaped-text alpha matte'],'before':'native Arabic shape retained but masked','during':'baseline, ascenders and descenders reveal on staggered curves','settled':'original text and font pixels'},
 'title_dots':{'start':.55,'duration':.92,'depth':495,'properties':['component masks, right-to-left range selector'],'before':'dots masked at their original positions','during':'local apertures reveal dots after their body strokes','settled':'correct joined Arabic typography'},
 'eyebrow':{'start':.12,'duration':.68,'depth':495,'properties':['Arabic mask reveal'],'before':'hidden by matte','during':'separate smaller type clock','settled':'original label'},
 'subtitle_mount':{'start':.85,'duration':.55,'depth':125,'properties':['paper matte','independent shadow'],'before':'paper hidden','during':'tear-edge grows across its final position','settled':'original subtitle backing'},
 'subtitle_type':{'start':1.04,'duration':.76,'depth':530,'properties':['Arabic body/dot mattes'],'before':'type hidden independently of backing','during':'right-to-left ink build','settled':'original words'},
 'thread':{'start':.72,'duration':1.75,'depth':450,'properties':['trim path','moving stroke tip'],'before':'zero length','during':'arc-length reveal with a following tip','settled':'original red path'},
 'detail':{'start':3.2,'duration':.82,'depth':495,'properties':['independent type matte'],'before':'hidden','during':'supporting detail follows primary explanation','settled':'original words'}
}
PHOTO={'inscription':'inscription','sky':'dawn','transformation':'myrtles','pool':'myrtles','court':'lions','lions':'lions','rim':'lions','dome':'dome','motto':'inscription','sound':'inscription','sigh':'dawn','change':'dawn','archive':'dawn','return':'inscription'}
MASK={'inscription':'aperture-lens','sky':'horizon-rise','pool':'facade-then-water-reflection','court':'center-out-radial','lions':'center-out-radial','rim':'basin-band','dome':'radial-ceiling','motto':'vertical-epigraphy','sound':'vertical-epigraphy','change':'archive-sheet','archive':'archive-sheet'}
plans={};rows=[]
for s in old['scenes']:
 if s['type'] in ['verse','credits']:continue
 a=s['from'] if s['from']<CI else s['from']+DELTA;b=s['to'] if s['to']<=CI else s['to']+DELTA
 roles=json.loads(json.dumps(BASE));duration=s['to']-s['from']
 roles['detail']['start']=min(3.2,duration*.4)
 if s['type']=='founder':
  roles['title_body']['start']=6.4;roles['title_dots']['start']=6.65;roles['subtitle_mount']['start']=4.35;roles['subtitle_type']['start']=4.52;roles['detail']['start']=1.7
 if s['type']=='pool':roles['reflection']={'start':2.7,'duration':1.25,'depth':102,'properties':['separate lower-photo track matte'],'before':'reflection concealed','during':'waterline reveals downward','settled':'unaltered real reflection'}
 if s['type'] in ['founder','poet','foundation','key','fall']:
  subject={'founder':'founder','poet':'poet','foundation':'hands','key':'key','fall':'key'}[s['type']]
  roles['subject_body']={'start':.05,'duration':1.25,'depth':210,'properties':['cutout silhouette matte'],'before':'fully keyed transparent subject','during':'body-specific contour reveal','settled':'original generated illustration'}
  roles['subject_detail']={'start':.48,'duration':1.03,'depth':235,'properties':['independent head/hand/scroll mask','limited articulated movement'],'before':'masked secondary parts','during':'detail parts settle after main silhouette','settled':'cleanly registered sublayers'}
  roles['subject_shadow']={'start':.05,'duration':1.4,'depth':175,'properties':['contact shadow offset','softness'],'before':'soft floating contact','during':'separate optical settling','settled':'warm scene-matched contact'}
 else:subject=None
 # Graphic-specific sequences. They live in final parent coordinates; the parent itself has no entrance animation.
 graphics={
  'centuries':'8 separate paper strata; each 0.13s apart; the numeral has its own mask clock',
  'map':'sea plate, country masks, Granada pin, pin ring, location type and route in sequence',
  'decline':'map geography, individual city markers, individual crossing strokes; no group movement',
  'layers':'red foundation, two paper levels, six blueprint cells per level, genuine skyline and three separate tags',
  'aqueduct':'terrain matte, arch strokes, channel bed, flowing water path, distance type and individual plants',
  'growth':'individual stems and leaf strokes follow water; no scaling of the complete panel',
  'patrons':'two separate arch panels, two names, two masks and independent cast shadows',
  'columns':'124 distinct count marks in four rows; staggered per mark, not a group scale',
  'lions':'12 distinct radial markers plus separate bowl contour and number typography',
  'dome':'genuine ceiling photo, independent geometric facets and separately trimmed star contours',
  'motto':'three independently masked lines; real epigraphy stays untouched',
  'sound':'epigraphy, headline body/dots, subtitle backing/type and audio-derived trace have separate clocks',
  'year':'four fixed-position digit regions revealed separately; date underline follows last digit',
  'visitors':'numerical text, year label, eighty individual count dots and source credit independent',
  'poem':'five arch outlines, paper body, main connected word and red underline on different clocks',
 }.get(s['type'],'Independent subject/image, typography, backing, shadow and annotation layers; static elements remain static where motion is not useful.')
 plan={'id':s['id'],'type':s['type'],'source_start':s['from'],'source_end':s['to'],'new_start':a,'new_end':b,'title_unchanged':s['title'],'subtitle_unchanged':s.get('subtitle',''),'font_families_unchanged':['Amiri','Alexandria'],'photo':PHOTO.get(s['type']),'photo_mask':MASK.get(s['type'],'angled-paper-reveal'),'generated_subject':subject,'camera_intent':'slow authored focus move toward the explaining element; no random per-shot zoom','focus_depth':s['focus'],'roles':roles,'graphic_sequence':graphics,'parent_control':'layout only; no shared entrance translation/scale/opacity'}
 plans[s['id']]=plan
 for role,p in roles.items():rows.append([s['id'],s['type'],a,b,role,p['start'],p['duration'],p['depth'],' / '.join(p['properties']),p['before'],p['during'],p['settled']])
config={'version':'layered-v5','width':1920,'height':1080,'fps':32,'song_source_in':SI,'song_source_out':SO,'song_exact_seconds':SO-SI,'song_frames':MF,'song_video_seconds':MD,'song_padding_seconds':MD-(SO-SI),'narration_cut_in':CI,'narration_resume_source':CO,'narration_resume_new':CI+MD,'narration_tail_offset':DELTA,'credits_start':END-7,'credits_seconds':7,'duration':END,'total_frames':round(END*32),'original_narration_seconds':265.4,'source_scenes':old['scenes'],'plans':plans,'output_is_not_an_aep_project':True,'native_render_implementation':'Canvas alpha mattes, shape-path trimming, per-element keyframes, parent transforms and perspective layers'}
(D/'layer-plan.json').write_text(json.dumps(config,ensure_ascii=False,indent=2))
with (R/'docs/v5-independent-layer-sheet.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['scene','type','new_start','new_end','independent_layer','local_start','duration','depth','animated_properties','before','during','settled']);w.writerows(rows)
print('V5 planned:',len(plans),'scene-specific plans;',len(rows),'independent role records;',config['total_frames'],'frames;',END,'seconds.')
