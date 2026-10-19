"""Checks and sampled visual evidence from the actual encoded v5 film."""
from pathlib import Path
import json,hashlib,subprocess,io
import av,numpy as np,imageio_ffmpeg,requests
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[1];C=json.loads((R/'src/layered-v5/layer-plan.json').read_text());M=json.loads((R/'src/layered-v5/chorus-data.json').read_text());S=json.loads((R/'research/v5-render-manifest.json').read_text());TMP=Path('/home/user/.cache/alhambra-render/layered-v5');QA=TMP/'encoded-qa';QA.mkdir(parents=True,exist_ok=True);FF=imageio_ffmpeg.get_ffmpeg_exe()
master=Path(S['master']['path']);view=Path(S['viewing']['path']);mix=TMP/'alhambra-layered-v5-full-mix.m4a'
assert len(S['segments'])==34 and sum(a['frames'] for a in S['segments'])==10758 and all(a.get('backup_commit') for a in S['segments'])
assert S['full_decoder_check']=='passed' and S['cfr_pts_verified']
def packets(p):
 with av.open(str(p)) as c:
  assert len(c.streams.audio)==1
  return [bytes(p) for p in c.demux(c.streams.audio[0]) if p.size]
a=packets(master);b=packets(mix);assert len(a)<=len(b) and b[:len(a)]==a and len(b)-len(a)<=4

def wave(p,ss=None,dur=None):
 cmd=[FF,'-v','error']
 if ss is not None:cmd+=['-ss',str(ss)]
 cmd+=['-i',str(p)]
 if dur is not None:cmd+=['-t',str(dur)]
 cmd+=['-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'];return np.frombuffer(subprocess.run(cmd,capture_output=True,check=True).stdout,dtype='<f4').copy()
x=wave(master,C['narration_cut_in'],C['song_exact_seconds']);y=wave(TMP/'chorus-matched.wav',0,C['song_exact_seconds']);n=min(len(x),len(y));corr=float(np.corrcoef(x[:n],y[:n])[0,1]);assert corr>.97,corr
print('EXACT_CHORUS_CORRELATION',corr,flush=True)
points=[]
for scene in C['source_scenes']:
 if scene['type'] in ['verse','credits']:continue
 t=min(scene['to']-.25,scene['from']+(scene['to']-scene['from'])*.84)
 if scene['type']=='founder':t=59
 if t>=C['narration_resume_source']:t+=C['narration_tail_offset']
 points.append((scene['id'],scene['type'],t))
for line in M['lines']:
 t=min(line['until']-.12,line['words'][-1]['end']+.08);points.append(('M'+str(line['id']+1).zfill(2),line['world'],C['narration_cut_in']+t))
points.append(('C5','personal-credit',C['credits_start']+5.8));points.sort(key=lambda x:x[2])
frames=[]
def take(c,t):
 c.seek(max(0,int((t-.1)*av.time_base)),backward=True)
 for frame in c.decode(video=0):
  if frame.time is not None and frame.time>=t-.0001:return frame.to_image()
 raise RuntimeError('Cannot decode sample '+str(t))
with av.open(str(view)) as c:
 for sid,name,t in points:
  im=take(c,round(t*32)/32);frames.append((sid,name,t,im.copy()))
  if sid in ['11','12','29','31','M01','M04','M11','C5']:im.save(QA/f'final-{sid}.jpg',quality=94)
 with open(R/'research/v5-encoded-sample-times.json','w') as f:json.dump([{'scene':sid,'time':t} for sid,name,t in points],f,indent=2)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for page in range(4):
 subset=frames[page*16:(page+1)*16]
 if not subset:continue
 rows=(len(subset)+3)//4;sheet=Image.new('RGB',(1740,rows*280+10),'#e4ddce');g=ImageDraw.Draw(sheet)
 for i,(sid,name,t,im) in enumerate(subset):
  im.thumbnail((420,236));xx=10+i%4*435;yy=10+i//4*280;sheet.paste(im,(xx,yy));g.text((xx+3,yy+242),f'{sid} | {t:.2f}s | {name}',font=font,fill='#20271e')
 sheet.save(R/f'research/v5-final-encoded-{page+1}.jpg',quality=88,optimize=True)
# The proof strip exposes actual encoded progression, including the requested staged end credit.
proof_times=[.3,.6,.9,1.2,1.6,51.35,21.0,59.0,C['credits_start']+.4,C['credits_start']+1.1,C['credits_start']+2.1,C['credits_start']+3.4]
sheet=Image.new('RGB',(1740,850),'#e4ddce');g=ImageDraw.Draw(sheet)
with av.open(str(view)) as c:
 for i,t in enumerate(proof_times):
  im=take(c,t);im.thumbnail((420,236));xx=10+i%4*435;yy=10+i//4*280;sheet.paste(im,(xx,yy));g.text((xx+3,yy+242),f'encoded t={t:.3f}',font=font,fill='#20271e')
sheet.save(R/'research/v5-final-motion-progression.jpg',quality=89,optimize=True)
with av.open(str(master)) as c:take(c,35.0).save(R/'deliverables/layered-v5-poster.jpg',quality=94,optimize=True)
release=json.loads((R/'research/v5-release-published.json').read_text());repo=json.loads((R/'research/github-backup.json').read_text())['repository_full_name'];response=requests.get(f'https://api.github.com/repos/{repo}/releases/assets/{release["asset_id"]}',timeout=40);response.raise_for_status();asset=response.json();assert asset['size']==S['master']['bytes']
if asset.get('digest'):assert asset['digest']=='sha256:'+S['master']['sha256']
original_voice=hashlib.sha256((R/'assets/audio/voiceover_narration.mp3').read_bytes()).hexdigest();assert original_voice==json.loads((R/'project.json').read_text())['source_file_sha256']
report={'version':'layered-v5','status':'technical_pass_visual_review_pending','frames':10758,'width':1920,'height':1080,'fps':32,'duration':C['duration'],'scene_samples':50,'master_complete_decode':'passed','cfr_presentation_timestamps':'passed','start_time_zero':S['master']['start_time']==0,'retained_audio_payloads_match_mix':True,'trailing_aac_padding_packets_omitted':len(b)-len(a),'exact_source_song_interval':[618.670,690.000],'exact_source_song_seconds':71.330,'silent_video_grid_padding_seconds':C['song_padding_seconds'],'narrator_during_song':False,'song_waveform_correlation':round(corr,6),'original_narration_file_unchanged':True,'all_34_current_segments_backed_up':True,'release_asset_size_verified':True,'release_digest_verified':bool(asset.get('digest')),'master_download_url':release['download_url'],'master_sha256':S['master']['sha256'],'viewing_sha256':S['viewing']['sha256'],'native_aep_created':False,'implementation':'native Arabic alpha mattes, per-element keyframes, separate paper/photo/shadow layers, length-trimmed paths and authored perspective camera','review_scope':'technical checks and sampled actual encoded visual progression; no claim of manual listening to every second'}
(R/'research/v5-finalization.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('V5_ENCODED_REVIEW_READY',json.dumps(report,ensure_ascii=False),flush=True)
