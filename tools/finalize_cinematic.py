"""Verify the encoded master, prepare a bounded 1080p viewing copy, then await review.
The finalizer does not delete any file and does not finish the credential-bearing uploader until review.
"""
from pathlib import Path
import os,json,time,math,subprocess,hashlib,shutil,sys
import av,imageio_ffmpeg
import numpy as np
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[1];TMP=Path('/home/user/.cache/alhambra-render');FF=imageio_ffmpeg.get_ffmpeg_exe();Q=R/'sync-queue'
DONE=R/'research/finalization.json';review_flag=R/'research/final-review-approved.json'
EX={'__pycache__','.cache','.local','.npm','.venv','node_modules','out','dist','build','.arena','.next','.pytest_cache'}
def eligible():
 n=0
 for folder,dirs,files in os.walk('/home/user'):
  dirs[:]=[d for d in dirs if d not in EX]
  for name in files:
   p=Path(folder)/name
   if p.is_symlink():continue
   try:n+=p.stat().st_size
   except OSError:pass
 return n

def queue(kind,name,local=None,remote=None,message='Final delivery checkpoint'):
 job={'kind':kind,'message':message}
 if local is not None:job.update(local_path=str(local),remote_path=remote)
 p=Q/name;t=p.with_suffix('.pending');t.write_text(json.dumps(job,ensure_ascii=False,indent=2));t.replace(p)
 st=time.monotonic()
 while time.monotonic()-st<300:
  try:
   if json.loads(p.read_text()).get('status')=='uploaded':return
   if json.loads((R/'research/github-backup.json').read_text()).get('status')=='failed':raise RuntimeError('GitHub backup failed; final files are retained locally.')
  except json.JSONDecodeError:pass
  time.sleep(1)
 raise RuntimeError('Upload not confirmed. No files were deleted.')
def details(p):
 with av.open(str(p)) as c:
  v=c.streams.video[0];a=c.streams.audio[0]
  return {'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':v.width,'height':v.height,'fps':float(v.average_rate),'frame_count':v.frames,'video_duration':float(v.duration*v.time_base),'audio_duration':float(a.duration*a.time_base),'video_codec':v.codec_context.name,'audio_codec':a.codec_context.name,'pixel_format':v.codec_context.format.name}
def getframe(c,t):
 c.seek(max(0,int((t-.12)*av.time_base)),backward=True)
 chosen=None
 for f in c.decode(video=0):
  chosen=f
  if f.time is not None and f.time>=t-.0001:break
 if chosen is None:raise RuntimeError('No decodable frame at '+str(t))
 return chosen.to_image()
try:
 print('FINALIZER_WAITING_FOR_VERIFIED_MASTER',flush=True)
 st=time.monotonic()
 while True:
  try:m=json.loads((R/'research/render-checkpoints.json').read_text())
  except (FileNotFoundError,json.JSONDecodeError):m={}
  if m.get('status')=='paused_on_error':raise RuntimeError('Renderer paused: '+m.get('error','unknown'))
  if m.get('master_backup_commit') and m.get('master_staging_path'):break
  if time.monotonic()-st>5400:raise RuntimeError('Timed out waiting for the master; checkpoints remain backed up.')
  time.sleep(4)
 master=Path(m['master_staging_path']);info=details(master);conf=json.loads((R/'src/cinematic/timeline.json').read_text());assert info['frame_count']==conf['duration_frames'];assert info['fps']==32 and info['width']==1920 and info['height']==1080
 assert abs(info['video_duration']-info['audio_duration'])<.05
 print('MASTER_METADATA_OK',json.dumps(info),flush=True)
 # Validate presentation timestamps without decoding every frame first.
 with av.open(str(master)) as c:
  v=c.streams.video[0];pts=sorted(p.pts for p in c.demux(v) if p.pts is not None);step=1/(32*float(v.time_base));assert len(pts)==conf['duration_frames'];assert all(abs((b-a)-step)<1e-6 for a,b in zip(pts,pts[1:]))
 print('CFR_TIMESTAMPS_OK',len(pts),flush=True)
 # A full decoder pass catches corrupted packets and invalid media, not just a valid file header.
 check=subprocess.run([FF,'-hide_banner','-v','error','-i',str(master),'-map','0:v:0','-an','-f','null','-'],capture_output=True,text=True,timeout=600)
 if check.returncode or check.stderr.strip():raise RuntimeError('Full video decode check failed: '+check.stderr[-1500:])
 print('FULL_VIDEO_DECODE_OK',flush=True)
 delivery=R/m['local_delivery'] if m.get('local_delivery') else None
 compact_report=None
 if delivery is None:
  replace_target=R/'deliverables/alhambra-cinematic-viewing-1080p32.mp4'
  replace_size=replace_target.stat().st_size if replace_target.exists() else 0
  reserve=(1 if (R/'research/final-encoded-contact-1.jpg').exists() else 2)*1024**2
  budget=118*1024**2-eligible()+replace_size-reserve
  if budget<12*1024**2:raise RuntimeError('Insufficient persistent space for a viewing copy. Master is already backed up.')
  for crf in [25,26,27,28]:
   candidate=TMP/m['build_id']/f'alhambra-viewing-crf{crf}-exact32.mp4'
   print('ENCODE_VIEWING_COPY',crf,'budget',budget,flush=True)
   subprocess.run([FF,'-y','-hide_banner','-loglevel','warning','-i',str(master),'-map','0:v:0','-map','0:a:0','-c:v','libx264','-preset','veryfast','-crf',str(crf),'-threads','2','-pix_fmt','yuv420p','-r','32','-g','64','-c:a','copy','-frames:v',str(conf['duration_frames']),'-t',str(conf['duration']),'-movflags','+faststart','-metadata','title=الحمراء — قصيدة من حجر | 1080p32 viewing copy',str(candidate)],check=True,timeout=900)
   if candidate.stat().st_size<=budget:
    delivery=R/'deliverables/alhambra-cinematic-viewing-1080p32.mp4';delivery.parent.mkdir(exist_ok=True);shutil.copy2(candidate,delivery);compact_report={'crf':crf,'preset':'veryfast','unchanged_dimensions':[1920,1080],'unchanged_fps':32,'lossless':False,'master_preserved':True,'budget_bytes':budget};break
  if delivery is None:raise RuntimeError('Viewing copies exceed the safe snapshot budget; all candidates and the master are retained.')
 outinfo=details(delivery);assert outinfo['frame_count']==conf['duration_frames'] and outinfo['fps']==32, outinfo
 # One real movie frame is the poster; all review sheets are from the encoded master.
 (R/'deliverables').mkdir(exist_ok=True)
 with av.open(str(master)) as c:getframe(c,32.7).save(R/'deliverables/poster.jpg',quality=95,optimize=True)
 samples=[]
 with av.open(str(master)) as c:
  for s in conf['scenes']:
   t=round(min(s['to']-.4,s['from']+max(1.6,(s['to']-s['from'])*.62))*32)/32
   im=getframe(c,t);im.thumbnail((420,236));samples.append((s,t,im.copy()))
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
 for page in range(2):
  sheet=Image.new('RGB',(1750,1505),'#e4ddce');d=ImageDraw.Draw(sheet);d.text((15,12),f'ENCODED MASTER REVIEW {page+1}/2 | 1920x1080 | 32fps | 40 scenes',font=font,fill='#20271e')
  for i,(s,t,im) in enumerate(samples[page*20:(page+1)*20]):
   x=14+(i%4)*434;y=50+(i//4)*291;sheet.paste(im,(x,y));d.text((x+3,y+244),f'{s["id"]}  {t:.2f}s  {s["type"]}',font=font,fill='#20271e')
  sheet.save(R/f'research/final-encoded-contact-{page+1}.jpg',quality=91,optimize=True)
 # Final viewing-copy text/readability check stills are compact, persistent, and reproducible.
 with av.open(str(delivery)) as c:
  for name,t in [('opening',2.7),('date',39.8),('verse',173.1),('closing',261.5)]:
   getframe(c,t).save(R/f'research/viewing-quality-{name}.jpg',quality=93,optimize=True)
 report={'status':'awaiting_final_visual_review','build_id':m['build_id'],'master':info,'viewing_copy':outinfo,'viewing_copy_relative':str(delivery.relative_to(R)),'compact_encoding':compact_report,'cfr_pts_verified':True,'full_decoder_pass':'passed','master_backed_up_before_viewing_encode':True,'checkpoints_preserved':len(m['completed_segments']),'required_checkpoints':m['total_segments'],'credential_written_to_project':False}
 DONE.write_text(json.dumps(report,ensure_ascii=False,indent=2))
 # Back up the complete viewing video now; the review gate controls final status, not preservation.
 queue('artifact',f'850-{m["build_id"]}-viewing.json',delivery,'renders/final/'+delivery.name,'Preserve same-resolution full-length viewing copy')
 print('FINAL_REVIEW_READY '+str(delivery),flush=True)
 while not review_flag.exists():time.sleep(3)
 review=json.loads(review_flag.read_text());assert review.get('approved_for_delivery') is True
 project=json.loads((R/'project.json').read_text());project.update(stage='rendered_and_delivered',video_rendered=True,full_film_built=True,duration_seconds=conf['duration'],planned_total_frames=conf['duration_frames'],github_backup_authorized=True,master_repository_path='renders/final/alhambra-cinematic-1080p32.mp4',local_video=str(delivery.relative_to(R)),quality_status='technical_checks_passed_visual_contacts_reviewed_user_final_review_pending',next_action='User may review the full film; no further changes or publishing beyond this project without a request.');(R/'project.json').write_text(json.dumps(project,ensure_ascii=False,indent=2))
 report['status']='delivered';report['review']=review;DONE.write_text(json.dumps(report,ensure_ascii=False,indent=2))
 # Preserve exact source/media hashes after the lossless PNG optimization and new render.
 lines=[]
 for folder in ['assets','src','preview','deliverables']:
  for p in sorted((R/folder).rglob('*')):
   if p.is_file():lines.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(R)))
 (R/'research/file-manifest.sha256').write_text('\n'.join(lines)+'\n')
 repo=json.loads((R/'research/github-backup.json').read_text())['repository_url']
 readme=(R/'README.md').read_text();a='> الحالة الحالية: اعتماد التصميم، بناء المحرك السينمائي، ثم تصيير الفيلم ورفع نقاط الحفظ تباعًا. راجع `research/render-checkpoints.json` للتقدم الفعلي؛ لا تعني هذه الصفحة أن أجزاء لم تُصيّر قد اكتملت.'
 b=f'> **اكتمل الفيلم:** 04:29.406، أفقي 1920×1080، 32fps، و27 جزءًا محفوظًا قبل الدمج.\n\n![الفيلم](deliverables/poster.jpg)\n\n- [النسخة الرئيسية كاملة](renders/final/alhambra-cinematic-1080p32.mp4)\n- [نسخة العرض الخفيفة بنفس الدقة والإطارات](renders/final/{delivery.name})\n- [مصادر العمل وتراخيصه](CREDITS.md)\n\nعدد إطارات الفيلم: 8,621. يشمل التعليق الأصلي وأربع ثوانٍ تقريبًا للمصادر.'
 (R/'README.md').write_text(readme.replace(a,b))
 queue('snapshot',f'950-{m["build_id"]}-delivery-report.json',message='Preserve final film QA, credits, poster, manifests and restoration instructions')
 queue('finish',f'999-{m["build_id"]}-complete.json',message='Complete verified cinematic film delivery and all backups')
 print('FINAL_DELIVERY_AND_BACKUP_COMPLETE '+repo,flush=True)
except Exception as e:
 DONE.write_text(json.dumps({'status':'paused_on_error','error':str(e)},ensure_ascii=False,indent=2));print('FINALIZER_PAUSED '+str(e),flush=True);raise
