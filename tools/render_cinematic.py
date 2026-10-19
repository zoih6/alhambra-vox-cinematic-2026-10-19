"""Render deterministic 1080p32 checkpoints, back up each one, then merge.
No frame sequences are saved. No source, checkpoint, or final output is deleted.
Transient render storage is outside the snapshot budget; every completed video is backed up immediately.
"""
from pathlib import Path
import os,sys,json,time,subprocess,base64,hashlib,math,shutil,argparse
import av,imageio_ffmpeg
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];TMP=Path('/home/user/.cache/alhambra-render');Q=R/'sync-queue';Q.mkdir(exist_ok=True)
CONFIG=json.loads((R/'src/cinematic/timeline.json').read_text());FPS=CONFIG['fps'];TOTAL=CONFIG['duration_frames'];FF=imageio_ffmpeg.get_ffmpeg_exe()
BUILD=hashlib.sha256((R/'src/cinematic/engine.js').read_bytes()+(R/'src/cinematic/timeline.json').read_bytes()).hexdigest()[:10]
SEG=TMP/BUILD/'segments';SEG.mkdir(parents=True,exist_ok=True)
PROGRESS=R/'research/render-progress.json';MANIFEST=R/'research/render-checkpoints.json'
args=argparse.ArgumentParser();args.add_argument('--parts',default='all');args.add_argument('--local-only',action='store_true');args.add_argument('--no-merge',action='store_true');args=args.parse_args()
parts=list(range(math.ceil(TOTAL/(FPS*10)))) if args.parts=='all' else [int(x)-1 for x in args.parts.split(',')]
state={'build_id':BUILD,'status':'rendering','fps':FPS,'width':1920,'height':1080,'total_frames':TOTAL,'total_segments':math.ceil(TOTAL/(FPS*10)),'completed_segments':[],'frame_pipeline':'Canvas -> JPEG quality 95 in memory -> FFmpeg image2pipe -> H.264; no frame directories'}
if MANIFEST.exists():
 old=json.loads(MANIFEST.read_text())
 if old.get('build_id')==BUILD:state=old
state['status']='rendering'
state.pop('error',None)

def save():
 MANIFEST.write_text(json.dumps(state,ensure_ascii=False,indent=2));PROGRESS.write_text(json.dumps({k:v for k,v in state.items() if k!='completed_segments'},ensure_ascii=False,indent=2))
def info(path):
 with av.open(str(path)) as c:
  v=c.streams.video[0]
  return {'duration':float(v.duration*v.time_base) if v.duration is not None else float(c.duration/av.time_base),'frames':int(v.frames),'fps':float(v.average_rate),'fps_fraction':str(v.average_rate),'width':v.width,'height':v.height,'video_codec':v.codec_context.name,'audio_streams':len(c.streams.audio),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
def enqueue(kind,name,local=None,remote=None,message='Checkpoint'):
 job={'kind':kind,'message':message}
 if local is not None:job.update(local_path=str(local),remote_path=remote)
 path=Q/name;temp=path.with_suffix('.pending');temp.write_text(json.dumps(job,ensure_ascii=False,indent=2));temp.replace(path)
 if args.local_only:return
 start=time.monotonic()
 while time.monotonic()-start<240:
  if path.exists():
   d=json.loads(path.read_text())
   if d.get('status')=='uploaded':return d
  backup=R/'research/github-backup.json'
  if backup.exists() and json.loads(backup.read_text()).get('status')=='failed':raise RuntimeError('Backup worker failed; rendering paused to protect checkpoints.')
  time.sleep(1)
 raise RuntimeError('Checkpoint backup not confirmed; rendering paused instead of risking data loss.')
def eligible_size():
 excluded={'.arena','.cache','.local','.mypy_cache','.next','.nox','.npm','.nuxt','.output','.parcel-cache','.pytest_cache','.ruff_cache','.svelte-kit','.tox','.turbo','.venv','.vite','__pycache__','build','coverage','dist','node_modules','out','target'}
 total=0
 for folder,dirs,files in os.walk('/home/user'):
  dirs[:]=[d for d in dirs if d not in excluded]
  for name in files:
   p=Path(folder)/name
   if not p.is_symlink():
    try:total+=p.stat().st_size
    except OSError:pass
 return total
try:
 assert json.loads((R/'project.json').read_text())['video_render_allowed'] is True
 assert (R/'assets/audio/film-mix-v2.m4a').exists()
 save();start_all=time.monotonic()
 with sync_playwright() as pw:
  browser=pw.chromium.launch(args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
  page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
  page.goto((R/'src/cinematic/index.html').as_uri());page.evaluate('()=>filmReady')
  for part in parts:
   first=part*FPS*10;last=min(TOTAL,first+FPS*10);n=last-first;duration=n/FPS
   path=SEG/f'part-{part+1:03}.mp4';remote=f'renders/{BUILD}/segments/{path.name}'
   record=next((x for x in state['completed_segments'] if x['part']==part+1),None)
   if path.exists() and record and record.get('frames')==n:
    print(f'RESUME_VERIFIED_PART {part+1}',flush=True)
   else:
    state.update(current_segment=part+1,current_frame=first,completed_count=len(state['completed_segments']));save()
    log=TMP/BUILD/f'encode-{part+1:03}.log';log.parent.mkdir(parents=True,exist_ok=True)
    cmd=[FF,'-y','-hide_banner','-loglevel','warning','-threads','1','-f','image2pipe','-vcodec','mjpeg','-framerate',str(FPS),'-i','pipe:0','-ss',f'{first/FPS:.8f}','-i',str(R/'assets/audio/film-mix-v2.m4a'),'-map','0:v:0','-map','1:a:0','-frames:v',str(n),'-t',f'{duration:.8f}','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-r',str(FPS),'-g','64','-threads','2','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',str(path)]
    print(f'RENDER_PART {part+1}/{state["total_segments"]} {first/FPS:.5f}-{last/FPS:.5f}s',flush=True)
    with log.open('wb') as loghandle:
     ff=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=loghandle,stdout=subprocess.DEVNULL)
     st=time.monotonic()
     try:
      for frame in range(first,last):
       encoded=page.evaluate('(t)=>{window.seek(t);return document.getElementById("film").toDataURL("image/jpeg",.95).split(",")[1]}',frame/FPS)
       ff.stdin.write(base64.b64decode(encoded))
       if (frame-first+1)%160==0:
        state.update(current_frame=frame,render_capture_fps=round((frame-first+1)/(time.monotonic()-st),2));save();print(f'  FRAME {frame+1}/{TOTAL} capture={state["render_capture_fps"]}fps',flush=True)
     finally:
      if ff.stdin:ff.stdin.close()
     code=ff.wait(timeout=90)
    if code:raise RuntimeError('Encoder failed: '+log.read_text()[-1500:])
    record=info(path);assert record['frames']==n and record['width']==1920 and record['height']==1080 and record['fps']==FPS,record
    record.update(part=part+1,frame_in=first,frame_out_exclusive=last,time_in=first/FPS,time_out=last/FPS,local_staging_path=str(path),repository_path=remote)
    state['completed_segments']=[x for x in state['completed_segments'] if x['part']!=part+1]+[record];state['completed_segments'].sort(key=lambda x:x['part']);state['completed_count']=len(state['completed_segments']);save()
   if not args.local_only:
    result=enqueue('artifact',f'100-{BUILD}-segment-{part+1:03}.json',path,remote,f'Render checkpoint {part+1:02}/{state["total_segments"]}: {first/FPS:.2f}-{last/FPS:.2f}s / 1080p32')
    record['backup_commit']=result['commit'];save()
   print(f'PART_PRESERVED {part+1} {record["bytes"]} bytes',flush=True)
  browser.close()
 if args.no_merge or len(state['completed_segments'])!=state['total_segments']:
  state['status']='partial_checkpoints_preserved';save();print('PARTIAL_RENDER_COMPLETE',flush=True);sys.exit(0)
 concat=TMP/BUILD/'concat.txt';text=''
 for x in state['completed_segments']:
  text+=f"file '{x['local_staging_path']}'\nduration {(x['frame_out_exclusive']-x['frame_in'])/FPS:.8f}\n"
 concat.write_text(text)
 master=TMP/BUILD/'alhambra-cinematic-1080p32.mp4'
 print('MERGING_ALL_PRESERVED_PARTS',flush=True)
 subprocess.run([FF,'-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',str(concat),'-i',str(R/'assets/audio/film-mix-v2.m4a'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-t',str(CONFIG['duration']),'-movflags','+faststart','-metadata','title=الحمراء — قصيدة من حجر','-metadata','comment=Arabic cinematic motion documentary. Sources and credits: https://github.com/zoih6/alhambra-vox-cinematic-2026-10-19',str(master)],check=True)
 master_info=info(master)
 if master_info['frames']!=TOTAL:raise RuntimeError('Merged frame count mismatch: '+str(master_info))
 state.update(status='rendered_pending_final_review',master=master_info,master_staging_path=str(master),render_elapsed_seconds=round(time.monotonic()-start_all,2));save()
 if master.stat().st_size>=95_000_000:raise RuntimeError('Master exceeds normal git file safety limit; preserve checkpoints and use a release asset. No file was deleted.')
 if not args.local_only:
  response=enqueue('artifact',f'800-{BUILD}-master.json',master,'renders/final/alhambra-cinematic-1080p32.mp4','Merge all preserved checkpoints into the full 1080p32 film')
  state['master_backup_commit']=response['commit']
 # Only copy the delivery into snapshot-eligible storage if it stays below the safety budget.
 if eligible_size()+master.stat().st_size < 118*1024**2:
  dest=R/'deliverables/alhambra-cinematic-1080p32.mp4';dest.parent.mkdir(exist_ok=True);shutil.copy2(master,dest);state['local_delivery']=str(dest.relative_to(R))
 else:
  state['local_delivery']=None;state['local_delivery_note']='Full-quality master is preserved in GitHub and local runtime staging; a size-budgeted viewing copy may be added after review.'
 save();print('FULL_FILM_RENDERED '+json.dumps(state['master']),flush=True);print('LOCAL_DELIVERY '+str(state.get('local_delivery')),flush=True)
except Exception as exc:
 state.update(status='paused_on_error',error=str(exc));save();print('RENDER_PAUSED '+str(exc),flush=True);raise
