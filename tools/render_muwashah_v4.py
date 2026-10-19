"""Targeted musical revision: preserve 24 original ten-second video pieces verbatim,
render singing/return/credit pieces, trim two junctions exactly, back up each new piece,
and assemble one continuous audio track. No original file is deleted.
"""
from pathlib import Path
import os,json,time,subprocess,base64,hashlib,math,shutil,sys
import av,imageio_ffmpeg
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];D=R/'src/muwashah-v4';TMP=Path('/home/user/.cache/alhambra-render/muwashah-v4');SEG=TMP/'segments';SEG.mkdir(parents=True,exist_ok=True)
Q=R/'sync-queue';FF=imageio_ffmpeg.get_ffmpeg_exe();CFG=json.loads((D/'edit-map.json').read_text());FPS=32
MIX=TMP/'alhambra-muwashah-full-mix.m4a';OLD=json.loads((R/'research/render-checkpoints.json').read_text());OLDPART={p['part']:p for p in OLD['completed_segments']}
MANIFEST=R/'research/muwashah-v4-render.json'
state={'version':'muwashah-v4','status':'rendering','width':1920,'height':1080,'fps':32,'total_frames':CFG['total_frames'],'duration':CFG['duration'],'pieces':[],'unchanged_source_pieces_reused':24,'narration_quote_replaced':[CFG['narrator_cut_in'],CFG['narrator_resume_source']],'music_duration':CFG['music_duration'],'credit_text':CFG['credit_text']}

def write_json(p,data):
 tmp=p.with_suffix('.pending');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2));tmp.replace(p)
def save():write_json(MANIFEST,state)
def media(p):
 with av.open(str(p)) as c:
  v=c.streams.video[0]
  return {'path':str(p),'frames':int(v.frames),'fps':float(v.average_rate),'width':v.width,'height':v.height,'start':float(v.start_time*v.time_base) if v.start_time is not None else 0,'duration':float(v.duration*v.time_base),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
def queue(name,path,remote,message):
 p=Q/name;write_json(p,{'kind':'artifact','local_path':str(path),'remote_path':remote,'message':message});start=time.monotonic()
 while time.monotonic()-start<300:
  try:
   j=json.loads(p.read_text())
   if j.get('status')=='uploaded':return j['commit']
   if json.loads((R/'research/github-backup.json').read_text()).get('status')=='failed':raise RuntimeError('GitHub backup failed; pause rather than risk unpreserved media.')
  except json.JSONDecodeError:pass
  time.sleep(1)
 raise RuntimeError('Backup confirmation timed out. Files are retained.')
def add_piece(name,path,frames,role,new=False,source=None):
 info=media(path);assert info['frames']==frames and info['fps']==32 and info['width']==1920 and info['height']==1080,info
 start=sum(p['frames'] for p in state['pieces']);info.update(name=name,role=role,new_render=new,frame_in_new=start,frame_out_new=start+frames)
 if source:info.update(source=source)
 if new:
  remote='renders/muwashah-v4/segments/'+path.name
  info['repository_path']=remote;save()
  info['backup_commit']=queue('v4-200-'+name+'.json',path,remote,'Preserve muwashah revision piece: '+name)
 else:
  info['repository_path']=source['repository_path'];info['backup_commit']=source['backup_commit']
 state['pieces'].append(info);state['completed_new_frames']=sum(x['frames'] for x in state['pieces']);save();print('PIECE_PRESERVED',name,frames,'frames',flush=True)

def trim_piece(part,count,name):
 path=SEG/(name+'.mp4');src=OLDPART[part]['local_staging_path']
 if not path.exists() or media(path)['frames']!=count:
  subprocess.run([FF,'-y','-hide_banner','-loglevel','error','-i',src,'-map','0:v:0','-vf',f'trim=start_frame=0:end_frame={count},setpts=PTS-STARTPTS','-an','-frames:v',str(count),'-r','32','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-g','64','-threads','2','-avoid_negative_ts','disabled','-movflags','+faststart',str(path)],check=True)
 add_piece(name,path,count,'frame-exact retained narration junction',True,{'source_part':part,'source_frames':[0,count]})

def render(page,mode,local_start,global_audio_start,count,name):
 path=SEG/(name+'.mp4')
 if path.exists() and media(path)['frames']==count:
  add_piece(name,path,count,mode,True,{'render_mode':mode,'seek_start':local_start});return
 cmd=[FF,'-y','-hide_banner','-loglevel','warning','-threads','1','-f','image2pipe','-vcodec','mjpeg','-framerate','32','-i','pipe:0','-ss',f'{global_audio_start:.8f}','-i',str(MIX),'-map','0:v:0','-map','1:a:0','-frames:v',str(count),'-t',f'{count/32:.8f}','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-r','32','-g','64','-threads','2','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',str(path)]
 print('RENDER',name,mode,local_start,'frames',count,flush=True);start=time.monotonic()
 with (TMP/(name+'.log')).open('wb') as log:
  proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log,stdout=subprocess.DEVNULL)
  try:
   for i in range(count):
    buf=page.evaluate('(t)=>{seek(t);return document.getElementById("film").toDataURL("image/jpeg",.95).split(",")[1]}',local_start+i/32)
    proc.stdin.write(base64.b64decode(buf))
    if (i+1)%160==0:print('  RENDER_PROGRESS',name,i+1,count,round((i+1)/(time.monotonic()-start),2),'fps',flush=True)
  finally:proc.stdin.close()
  assert proc.wait(timeout=120)==0,(TMP/(name+'.log')).read_text()[-1500:]
 add_piece(name,path,count,mode,True,{'render_mode':mode,'seek_start':local_start})

def size():
 exclusions={'.arena','.cache','.local','.mypy_cache','.next','.nox','.npm','.nuxt','.output','.parcel-cache','.pytest_cache','.ruff_cache','.svelte-kit','.tox','.turbo','.venv','.vite','__pycache__','build','coverage','dist','node_modules','out','target'};total=0
 for folder,dirs,files in os.walk('/home/user'):
  dirs[:]=[d for d in dirs if d not in exclusions]
  for name in files:
   p=Path(folder)/name
   if not p.is_symlink():
    try:total+=p.stat().st_size
    except OSError:pass
 return total
try:
 assert json.loads((R/'project.json').read_text())['narration_playback_edit_authorized']
 assert MIX.exists();save();started=time.monotonic()
 for part in range(1,17):add_piece(f'base-{part:03}',Path(OLDPART[part]['local_staging_path']),320,'unchanged approved original',False,OLDPART[part])
 trim_piece(17,round((CFG['narrator_cut_in']-160)*32),'prelude-junction')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']);page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
  page.goto((D/'music.html').as_uri());page.evaluate('()=>filmReady')
  for i,first in enumerate(range(0,CFG['music_frames'],320)):
   n=min(320,CFG['music_frames']-first);render(page,'music',first/32,CFG['narrator_cut_in']+first/32,n,f'music-{i+1:02}')
  page.goto((D/'resume.html').as_uri());page.evaluate('()=>filmReady')
  render(page,'resume',CFG['narrator_resume_source'],CFG['narrator_resume_new'],round((180-CFG['narrator_resume_source'])*32),'narrator-return')
  for part in range(19,27):add_piece(f'base-{part:03}',Path(OLDPART[part]['local_staging_path']),320,'unchanged approved original',False,OLDPART[part])
  trim_piece(27,round((CFG['source_voice_video_end']-260)*32),'closing-junction')
  page.goto((D/'credits.html').as_uri());page.evaluate('()=>filmReady');render(page,'credits',0,CFG['credit_start_new'],CFG['credit_frames'],'shatha-yasser-credits');browser.close()
 assert sum(x['frames'] for x in state['pieces'])==CFG['total_frames']
 state['status']='assembling';save();print('ALL_CHANGED_PIECES_BACKED_UP; assembling with unchanged footage',flush=True)
 # Remove unused per-piece audio without re-encoding video. This avoids AAC priming shifting the concat start.
 norm=TMP/'video-only';norm.mkdir(exist_ok=True);concat=TMP/'concat-video.txt';content=[]
 for i,piece in enumerate(state['pieces']):
  p=norm/f'{i+1:03}-{piece["name"]}.mp4'
  subprocess.run([FF,'-y','-v','error','-i',piece['path'],'-map','0:v:0','-an','-c:v','copy','-avoid_negative_ts','disabled','-movflags','+faststart',str(p)],check=True)
  v=media(p);assert v['frames']==piece['frames'];assert abs(v['start'])<1/32000,v
  content.extend([f"file '{p}'",f'duration {piece["frames"]/32:.8f}'])
 concat.write_text('\n'.join(content)+'\n')
 master=TMP/'alhambra-muwashah-1080p32-master.mp4'
 subprocess.run([FF,'-y','-hide_banner','-loglevel','warning','-copyts','-f','concat','-safe','0','-i',str(concat),'-i',str(MIX),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-t',str(CFG['duration']),'-avoid_negative_ts','disabled','-movflags','+faststart','-metadata','title=الحمراء — قصيدة من حجر | فقرة الموشح','-metadata','artist=المونتاج والتصميم بواسطة شذى ياسر','-metadata','comment=Supplied sung performance: Sami Yusuf, En al-Andalus. Sources and credits in the project repository.',str(master)],check=True)
 master_info=media(master);assert master_info['frames']==CFG['total_frames'] and master_info['fps']==32,master_info
 with av.open(str(master)) as c:
  v=c.streams.video[0];pts=sorted(p.pts for p in c.demux(v) if p.pts is not None);unit=1/(32*float(v.time_base));assert len(pts)==CFG['total_frames'];assert all(abs(b-a-unit)<1e-6 for a,b in zip(pts,pts[1:]))
 check=subprocess.run([FF,'-v','error','-i',str(master),'-map','0:v:0','-an','-f','null','-'],capture_output=True,text=True,timeout=600);assert check.returncode==0 and not check.stderr.strip(),check.stderr[-1500:]
 assert master.stat().st_size<95_000_000,'Master is over the normal git safety cap; all components remain preserved.'
 state.update(status='master_verified',master=master_info,master_constant_pts=True,master_full_decode='passed');save()
 state['master_backup_commit']=queue('v4-800-master.json',master,'renders/final/'+master.name,'Deliver the complete revised film with the sung muwashah and Shatha Yasser credit');save()
 # Retain the higher-quality master remotely. The local full-HD viewing file must fit the snapshot budget.
 destination=R/'deliverables/alhambra-muwashah-viewing-1080p32.mp4';replace=destination.stat().st_size if destination.exists() else 0
 budget=118*1024**2-size()+replace-2*1024**2
 for crf in [27,28,29]:
  candidate=TMP/f'alhambra-muwashah-viewing-crf{crf}.mp4';print('VIEWING_COPY',crf,'budget_bytes',budget,flush=True)
  subprocess.run([FF,'-y','-v','warning','-i',str(master),'-map','0:v:0','-map','0:a:0','-vf','setpts=PTS-STARTPTS','-c:v','libx264','-preset','veryfast','-crf',str(crf),'-threads','2','-pix_fmt','yuv420p','-r','32','-g','64','-frames:v',str(CFG['total_frames']),'-t',str(CFG['duration']),'-c:a','copy','-avoid_negative_ts','disabled','-movflags','+faststart',str(candidate)],check=True,timeout=1200)
  if candidate.stat().st_size<=budget:
   assert media(candidate)['frames']==CFG['total_frames'];destination.parent.mkdir(exist_ok=True);shutil.copy2(candidate,destination);break
 else:raise RuntimeError('Viewing copies exceed the safe local budget; all files retained and the master is already public.')
 state.update(status='awaiting_final_review',viewing=media(destination),viewing_crf=crf,elapsed_seconds=round(time.monotonic()-started,1));save()
 state['viewing_backup_commit']=queue('v4-850-viewing.json',destination,'renders/final/'+destination.name,'Preserve the complete 1080p32 viewing version of the muwashah revision');save()
 print('MUWASHAH_V4_REVIEW_READY',json.dumps({'master':state['master'],'viewing':state['viewing']},ensure_ascii=False),flush=True)
except Exception as exc:
 state.update(status='paused_on_error',error=str(exc));save();print('MUWASHAH_RENDER_PAUSED',repr(exc),flush=True);raise
