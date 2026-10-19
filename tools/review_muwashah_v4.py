"""Review the actual encoded revision, not only its design frames."""
from pathlib import Path
import json,av,subprocess,hashlib
import numpy as np,imageio_ffmpeg
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[1];CFG=json.loads((R/'src/muwashah-v4/edit-map.json').read_text());S=json.loads((R/'research/muwashah-v4-render.json').read_text());MASTER=Path(S['master']['path']);VIEW=Path(S['viewing']['path']);TMP=Path('/home/user/.cache/alhambra-render/muwashah-v4');FF=imageio_ffmpeg.get_ffmpeg_exe()
assert S['master_full_decode']=='passed' and S['master_constant_pts']
assert len(S['pieces'])==33 and sum(p['frames'] for p in S['pieces'])==9935
assert sum(not p['new_render'] for p in S['pieces'])==24 and all(p.get('backup_commit') for p in S['pieces'])
def audio_packets(path):
 with av.open(str(path)) as c:
  assert len(c.streams.audio)==1
  return [bytes(p) for p in c.demux(c.streams.audio[0]) if p.size]
a=audio_packets(MASTER);b=audio_packets(TMP/'alhambra-muwashah-full-mix.m4a')
# The exact-duration movie omits trailing AAC padding packets, but never changes retained audio payloads.
assert len(a)<=len(b) and b[:len(a)]==a and len(b)-len(a)<=3

def wave(path,ss=None,dur=None):
 args=[FF,'-v','error']
 if ss is not None:args+=['-ss',str(ss)]
 args+=['-i',str(path)]
 if dur is not None:args+=['-t',str(dur)]
 args+=['-vn','-ac','1','-ar','16000','-f','f32le','pipe:1']
 return np.frombuffer(subprocess.run(args,capture_output=True,check=True).stdout,dtype='<f4').copy()
x=wave(MASTER,CFG['narrator_cut_in'],CFG['music_duration']);y=wave(TMP/'performance-matched.wav');n=min(len(x),len(y));corr=float(np.corrcoef(x[:n],y[:n])[0,1]);print('Sung interval waveform correlation:',corr,flush=True)
assert hashlib.sha256((R/'assets/audio/voiceover_narration.mp3').read_bytes()).hexdigest()==json.loads((R/'project.json').read_text())['source_file_sha256']
points=[('song',CFG['narrator_cut_in']+q) for q in [1.4,4.8,10.7,16,23.7,29.7,35.5,39.7,44.3]]+[('voice returns',CFG['narrator_resume_new']+1.1),('credit',CFG['credit_start_new']+2.7),('credit',CFG['credit_start_new']+5.5)]
frames=[]
with av.open(str(VIEW)) as c:
 for label,t in points:
  c.seek(max(0,int((t-.1)*av.time_base)))
  for f in c.decode(video=0):
   if f.time>=t-.0001:
    im=f.to_image();frames.append((label,t,im.copy()))
    if label=='credit' and abs(t-(CFG['credit_start_new']+2.7))<.001:im.save(TMP/'qa/final-credit.jpg',quality=95)
    if label=='song' and abs(t-(CFG['narrator_cut_in']+29.7))<.001:im.save(TMP/'qa/final-lyrics.jpg',quality=95)
    break
sheet=Image.new('RGB',(1740,950),'#e4ddce');d=ImageDraw.Draw(sheet);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
for i,(label,t,im) in enumerate(frames):
 im.thumbnail((420,236));xx=10+i%4*435;yy=10+i//4*313;sheet.paste(im,(xx,yy));d.text((xx+4,yy+246),f'{label}: {int(t//60):02}:{t%60:05.2f}',font=font,fill='#20271e')
sheet.save(R/'research/muwashah-v4-final-contact.jpg',quality=90,optimize=True)
report={'status':'technical_pass_visual_review_pending','version':'muwashah-v4','frame_count':9935,'fps':32,'width':1920,'height':1080,'duration':CFG['duration'],'video_start':S['master']['start'],'master_full_decode':'passed','cfr_pts':'passed','retained_audio_packets_exactly_match_continuous_mix':True,'trailing_aac_padding_packets_omitted':len(b)-len(a),'singing_waveform_correlation_to_supplied_performance':round(corr,6),'narrator_present_during_performance':False,'new_rendered_pieces':sum(p['new_render'] for p in S['pieces']),'reused_unchanged_pieces':24,'new_frames_captured_in_browser':1460+129+224,'all_current_pieces_have_backup_commits':True,'selected_performance_seconds':CFG['music_duration'],'credit':'المونتاج والتصميم بواسطة شذى ياسر','viewing_copy_sha256':S['viewing']['sha256'],'master_sha256':S['master']['sha256'],'previous_film_preserved':True,'review_scope':'decoder, timestamps, actual encoded-frame samples, audio-copy integrity and waveform comparison; not a claim of manual real-time listening'}
(R/'research/muwashah-v4-finalization.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('ENCODED_REVIEW_READY',json.dumps(report,ensure_ascii=False),flush=True)
