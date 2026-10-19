"""Full v5 frame-based render with immediate per-piece backup and a release-quality master.
All original versions are preserved. No saved frame sequence and no out/ directory.
"""
from pathlib import Path
import json,time,hashlib,base64,subprocess,math,shutil,os,sys
import av,imageio_ffmpeg
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];D=R/'src/layered-v5';C=json.loads((D/'layer-plan.json').read_text());FPS=32;TOTAL=C['total_frames'];FF=imageio_ffmpeg.get_ffmpeg_exe()
BUILD=hashlib.sha256((D/'engine.js').read_bytes()+(D/'layer-plan.json').read_bytes()+(D/'chorus-data.json').read_bytes()).hexdigest()[:12]
TMP=Path('/home/user/.cache/alhambra-render/layered-v5');RUN=TMP/BUILD;SEG=RUN/'segments';SEG.mkdir(parents=True,exist_ok=True);MIX=TMP/'alhambra-layered-v5-full-mix.m4a'
Q=R/'sync-queue';MAN=R/'research/v5-render-manifest.json'
S={'version':'layered-v5','build_id':BUILD,'status':'rendering','width':1920,'height':1080,'fps':32,'total_frames':TOTAL,'duration':C['duration'],'segments':[],'segment_count':math.ceil(TOTAL/320),'whole_film_rebuilt':True,'master_crf':20,'original_sources_deleted':False}
if MAN.exists():
 old=json.loads(MAN.read_text())
 if old.get('build_id')==BUILD:S=old;S['status']='rendering';S.pop('error',None)
def write(p,x):
 tmp=p.with_suffix('.pending');tmp.write_text(json.dumps(x,ensure_ascii=False,indent=2));tmp.replace(p)
def save():write(MAN,S)
def media(path):
 with av.open(str(path)) as c:
  v=c.streams.video[0]
  return {'path':str(path),'frames':int(v.frames),'fps':float(v.average_rate),'width':v.width,'height':v.height,'duration':float(v.duration*v.time_base),'start_time':float(v.start_time*v.time_base) if v.start_time is not None else 0,'audio_streams':len(c.streams.audio),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
def submit(name,kind,path=None,remote=None,message='v5 checkpoint'):
 job={'kind':kind,'message':message}
 if path is not None:job['local_path']=str(path)
 if remote is not None:job['remote_path']=remote
 if kind=='release':job.update(tag='v5-layered-motion',release_name='الحمراء — الإصدار الطبقي الخامس',release_body='1920×1080, 32fps. Independent typography mattes, separately animated paper/photo/shadow layers, imagined historical illustrations, and the exact requested chorus from 10:18.670 to 11:30.000. All credits and source records are in the repository.')
 p=Q/name;write(p,job);start=time.monotonic()
 while time.monotonic()-start<420:
  try:
   d=json.loads(p.read_text())
   if d.get('status')=='uploaded':return d
   b=json.loads((R/'research/github-backup.json').read_text())
   if b.get('status')=='failed':raise RuntimeError('Backup failed; production paused so no completed piece is lost.')
  except json.JSONDecodeError:pass
  time.sleep(1)
 raise RuntimeError('Upload confirmation timed out; all local data remains retained.')
def eligible():
 skip={'.arena','.cache','.local','.mypy_cache','.next','.nox','.npm','.nuxt','.output','.parcel-cache','.pytest_cache','.ruff_cache','.svelte-kit','.tox','.turbo','.venv','.vite','__pycache__','build','coverage','dist','node_modules','out','target'};n=0
 for folder,dirs,files in os.walk('/home/user'):
  dirs[:]=[d for d in dirs if d not in skip]
  for name in files:
   p=Path(folder)/name
   if not p.is_symlink():
    try:n+=p.stat().st_size
    except OSError:pass
 return n
try:
 assert json.loads((R/'project.json').read_text())['video_render_allowed'];assert MIX.is_file()
 save();submit('v5-030-engine-'+BUILD+'.json','snapshot',message='Preserve the complete independent-layer engine and all scene-specific motion plans before final rendering')
 started=time.monotonic()
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']);page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto((D/'index.html').as_uri());page.evaluate('()=>filmReady')
  for part in range(S['segment_count']):
   first=part*320;last=min(TOTAL,first+320);count=last-first;file=SEG/f'part-{part+1:03}.mp4';record=next((a for a in S['segments'] if a['part']==part+1),None)
   valid=False
   if file.exists():
    try:info=media(file);valid=info['frames']==count and info['fps']==32
    except Exception:valid=False
   if not valid:
    S.update(current_segment=part+1,current_frame=first);save();print(f'V5_RENDER {part+1}/{S["segment_count"]} {first/32:.5f}–{last/32:.5f}s',flush=True)
    cmd=[FF,'-y','-hide_banner','-loglevel','warning','-threads','1','-f','image2pipe','-vcodec','mjpeg','-framerate','32','-i','pipe:0','-ss',f'{first/32:.8f}','-i',str(MIX),'-map','0:v:0','-map','1:a:0','-frames:v',str(count),'-t',f'{count/32:.8f}','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-r','32','-g','64','-threads','2','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',str(file)]
    start=time.monotonic()
    with (RUN/f'encode-{part+1:03}.log').open('wb') as log:
     proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log,stdout=subprocess.DEVNULL)
     try:
      for frame in range(first,last):
       encoded=page.evaluate('(t)=>{seek(t);return document.getElementById("film").toDataURL("image/jpeg",.95).split(",")[1]}',frame/32)
       proc.stdin.write(base64.b64decode(encoded))
       if (frame-first+1)%160==0:
        S.update(current_frame=frame+1,capture_fps=round((frame-first+1)/(time.monotonic()-start),2));save();print('  FRAME',frame+1,'/',TOTAL,'capture',S['capture_fps'],'fps',flush=True)
     finally:proc.stdin.close()
     code=proc.wait(timeout=120)
    if code:raise RuntimeError('Encoder failed: '+(RUN/f'encode-{part+1:03}.log').read_text()[-1800:])
    if errors:raise RuntimeError('Browser render error: '+errors[-1])
   info=media(file);assert info['frames']==count and info['fps']==32 and info['width']==1920 and info['height']==1080,info
   info.update(part=part+1,frame_in=first,frame_out_exclusive=last,time_in=first/32,time_out=last/32,repository_path=f'renders/layered-v5/{BUILD}/segments/{file.name}')
   S['segments']=[a for a in S['segments'] if a['part']!=part+1]+[info];S['segments'].sort(key=lambda a:a['part']);save()
   j=submit(f'v5-200-{BUILD}-{part+1:03}.json','artifact',file,info['repository_path'],f'Preserve layered v5 checkpoint {part+1:02}/{S["segment_count"]}: {first/32:.2f}–{last/32:.2f}s')
   info['backup_commit']=j['commit'];save();print('V5_PART_PRESERVED',part+1,info['bytes'],'bytes',flush=True)
  browser.close()
 assert sum(a['frames'] for a in S['segments'])==TOTAL and all(a.get('backup_commit') for a in S['segments'])
 S['status']='assembling';save();print('V5_ALL_SEGMENTS_PRESERVED',flush=True)
 video=RUN/'video-only';video.mkdir(exist_ok=True);lst=[]
 for a in S['segments']:
  p=video/f'part-{a["part"]:03}.mp4';subprocess.run([FF,'-y','-v','error','-i',a['path'],'-map','0:v:0','-an','-c:v','copy','-avoid_negative_ts','disabled','-movflags','+faststart',str(p)],check=True)
  info=media(p);assert info['frames']==a['frames'] and abs(info['start_time'])<1/32000
  lst.extend([f"file '{p}'",f'duration {a["frames"]/32:.8f}'])
 concat=RUN/'concat.txt';concat.write_text('\n'.join(lst)+'\n');master=RUN/'alhambra-layered-v5-1080p32-master.mp4'
 subprocess.run([FF,'-y','-v','warning','-copyts','-f','concat','-safe','0','-i',str(concat),'-i',str(MIX),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-t',str(C['duration']),'-avoid_negative_ts','disabled','-movflags','+faststart','-metadata','title=الحمراء — قصيدة من حجر | البناء الطبقي','-metadata','artist=المونتاج والتصميم بواسطة شذى ياسر',str(master)],check=True)
 info=media(master);assert info['frames']==TOTAL and info['fps']==32
 with av.open(str(master)) as con:
  v=con.streams.video[0];pts=sorted(x.pts for x in con.demux(v) if x.pts is not None);step=1/(32*float(v.time_base));assert len(pts)==TOTAL and all(abs(b-a-step)<1e-6 for a,b in zip(pts,pts[1:]))
 decode=subprocess.run([FF,'-v','error','-i',str(master),'-map','0:v:0','-an','-f','null','-'],capture_output=True,text=True,timeout=900);assert decode.returncode==0 and not decode.stderr.strip(),decode.stderr[-1500:]
 S.update(status='master_verified',master=info,cfr_pts_verified=True,full_decoder_check='passed');save();print('V5_MASTER_VERIFIED',info['bytes'],flush=True)
 release=submit('v5-800-master-release.json','release',master,'renders/final/v5-master-download.json','Publish the full-quality layered v5 master as a versioned repository release asset')
 S.update(master_download_url=release['download_url'],master_backup_commit=release['commit']);save()
 dest=R/'deliverables/alhambra-layered-v5-viewing-1080p32.mp4';replacement=dest.stat().st_size if dest.exists() else 0;budget=118*1024**2-eligible()+replacement-2*1024**2
 for crf in [26,27,28,29]:
  candidate=RUN/f'viewing-crf{crf}.mp4';print('V5_VIEWING_ENCODE',crf,'budget',budget,flush=True)
  subprocess.run([FF,'-y','-v','warning','-i',str(master),'-map','0:v:0','-map','0:a:0','-vf','setpts=PTS-STARTPTS','-c:v','libx264','-preset','veryfast','-crf',str(crf),'-threads','2','-pix_fmt','yuv420p','-r','32','-g','64','-frames:v',str(TOTAL),'-t',str(C['duration']),'-c:a','copy','-avoid_negative_ts','disabled','-movflags','+faststart',str(candidate)],check=True,timeout=1200)
  v=media(candidate);assert v['frames']==TOTAL and v['fps']==32
  if candidate.stat().st_size<=budget:
   dest.parent.mkdir(exist_ok=True);shutil.copy2(candidate,dest);S.update(viewing=media(dest),viewing_crf=crf);break
 else:raise RuntimeError('No viewing copy fits the local safety budget. All candidates and the public master are retained.')
 j=submit('v5-850-viewing.json','artifact',dest,'renders/final/'+dest.name,'Preserve the complete same-resolution layered v5 viewing copy');S['viewing_backup_commit']=j['commit'];S['viewing_repository_path']='renders/final/'+dest.name
 S.update(status='awaiting_final_review',render_elapsed_seconds=round(time.monotonic()-started,2));save();print('V5_FULL_FILM_REVIEW_READY',json.dumps({'master':S['master'],'master_url':S['master_download_url'],'viewing':S['viewing']},ensure_ascii=False),flush=True)
except Exception as exc:
 S.update(status='paused_on_error',error=str(exc));save();print('V5_RENDER_PAUSED',repr(exc),flush=True);raise
