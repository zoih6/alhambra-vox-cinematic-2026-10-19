"""Deterministic voice-led mix. Original supplied media are never overwritten."""
from pathlib import Path
import numpy as np,json,subprocess,re,math
import soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, correlate, find_peaks
from scipy.ndimage import uniform_filter1d
import imageio_ffmpeg
R=Path(__file__).resolve().parents[1];TMP=Path('/home/user/.cache/alhambra-render');TMP.mkdir(parents=True,exist_ok=True)
SR=48000;CONFIG=json.loads((R/'src/cinematic/timeline.json').read_text());DUR=CONFIG['duration'];N=round(DUR*SR)
ff=imageio_ffmpeg.get_ffmpeg_exe()
def load(path):
 y,s=sf.read(str(path),dtype='float32',always_2d=True)
 if s!=SR:y=resample_poly(y,SR,s,axis=0).astype('float32')
 if y.shape[1]==1:y=np.repeat(y,2,axis=1)
 return y[:,:2]
voice=load(R/'assets/audio/voiceover_narration.mp3');v=np.zeros((N,2),dtype='float32');v[:len(voice)]=voice
# Save an exact audio-derived amplitude envelope, not arbitrary decorative oscillation.
mono=v.mean(axis=1);frame_n=SR//32
amp=np.array([np.sqrt(np.mean(mono[i:i+frame_n]**2)) for i in range(0,N,frame_n)])
scale=max(.001,np.percentile(amp[amp>0],95));env=np.clip(amp/scale,0,1).round(4)
(R/'research/voice-envelope.json').write_text(json.dumps(env.tolist(),separators=(',',':')))
music=load(R/'assets/audio/background_music_option_2.mp3');mmono=music.mean(axis=1)
# A reproducible onset-envelope tempo estimate, explicitly secondary to speech timing.
hop=480;energy=np.sqrt(np.mean(mmono[:len(mmono)//hop*hop].reshape(-1,hop)**2,axis=1));on=np.maximum(0,np.diff(energy,prepend=energy[0]));on=uniform_filter1d(on,3)
corr=correlate(on,on,mode='full',method='fft')[len(on)-1:];lo,hi=round(100*60/150),round(100*60/65);lag=lo+int(np.argmax(corr[lo:hi]));bpm=6000/lag
peaks,_=find_peaks(on,distance=max(1,int(lag*.65)),prominence=max(.00001,np.std(on)*.25))
(R/'research/music-analysis.json').write_text(json.dumps({'music':'background_music_option_2.mp3','estimated_bpm':round(bpm,2),'method':'RMS-onset autocorrelation; not a manually verified downbeat grid','onset_times_seconds':(peaks/100).round(2).tolist(),'sync_policy':'voice-led; transitions are tied to narration, not forced to this grid'},indent=2))
# Normalize music by RMS, then equal-power crossfade the supplied track's loop.
rms=np.sqrt(np.mean(music**2));music*=.055/max(rms,.001)
bed=np.zeros((N,2),dtype='float32');cross=8*SR;step=len(music)-cross
for start in range(0,N,step):
 length=min(len(music),N-start);gain=np.ones(length,dtype='float32')
 if start>0:
  n=min(cross,length);gain[:n]=np.sin(np.linspace(0,np.pi/2,n))
 if start+length<N:
  n=min(cross,length);gain[-n:]=np.cos(np.linspace(0,np.pi/2,n))
 bed[start:start+length]+=music[:length]*gain[:,None]
# Duck below the original narrator with smooth envelope; avoid abrupt pumping.
activity=np.sqrt(uniform_filter1d(mono**2,SR//10));duck=1/(1+19*activity);duck=uniform_filter1d(duck,SR//4)
bed*=duck[:,None]*.41
fade=np.minimum(np.arange(N)/(SR*2.2),1);fade*=np.minimum((N-1-np.arange(N))/(SR*3.2),1);bed*=np.maximum(0,fade[:,None])
# Sparse, quiet tactile cues. No cues on the final sacred phrase.
sfx=np.zeros(N,dtype='float32');rng=np.random.default_rng(14921238)
cues=[]
def cue(at,kind,volume):
 if kind=='thump':
  dur=.32;t=np.arange(int(dur*SR))/SR;y=np.sin(2*np.pi*(86*t-45*t*t))*np.exp(-17*t)*volume
 elif kind=='paper':
  dur=.42;t=np.arange(int(dur*SR))/SR;y=sosfilt(butter(2,[450,3200],btype='bandpass',fs=SR,output='sos'),rng.standard_normal(len(t)))*np.sin(np.pi*t/dur)**2*volume
 else:
  dur=.055;t=np.arange(int(dur*SR))/SR;y=np.sin(2*np.pi*1180*t)*np.exp(-78*t)*volume
 st=round(at*SR);ln=min(len(y),N-st)
 if ln>0:sfx[st:st+ln]+=y[:ln]
 cues.append({'t':round(at,5),'type':kind,'amplitude':volume})
for s in CONFIG['scenes']:
 if s['type'] in {'closing','motto','dream','credits'}:continue
 cue(s['from']+.10,'paper',.009)
 if s['type'] in {'stone','year','fall','foundation','key','resistance'}:cue(s['from']+.36,'thump',.035)
for base,count,step_ in [(7.8125,8,.12),(125.9375,12,.13)]:
 for i in range(count):cue(base+.6+i*step_,'click',.006)
(R/'research/sfx-cues-cinematic.json').write_text(json.dumps(cues,indent=2))
premix=v+bed+sfx[:,None]
# Voice is not time-stretched, cut, re-voiced or replaced.
premix_path=TMP/'premix.wav';sf.write(premix_path,premix,SR,subtype='PCM_24')
first=subprocess.run([ff,'-hide_banner','-i',str(premix_path),'-af','loudnorm=I=-14:TP=-2.2:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
blocks=re.findall(r'\{\s*"input_i"[\s\S]*?\}',first.stderr);stats=json.loads(blocks[-1])
flt=f'loudnorm=I=-14:TP=-2.2:LRA=9:measured_I={stats["input_i"]}:measured_TP={stats["input_tp"]}:measured_LRA={stats["input_lra"]}:measured_thresh={stats["input_thresh"]}:offset={stats["target_offset"]}:linear=true:print_format=json'
output=R/'assets/audio/film-mix-v2.m4a'
subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(premix_path),'-af',flt,'-ar',str(SR),'-c:a','aac','-b:a','160k',str(output)],check=True)
check=subprocess.run([ff,'-hide_banner','-i',str(output),'-af','loudnorm=I=-14:TP=-2.2:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
final=json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',check.stderr)[-1])
report={'original_voice_unchanged':True,'voice_duration_seconds':len(voice)/SR,'mix_duration_seconds':DUR,'music_used':'background_music_option_2.mp3','unused_user_options_retained':['background_music_option_1.mp3','muwashah_en_al_andalus.m4a'],'reason_no_sung_overlay':'Avoid competing vocals over the recorded narrator; no unapproved extra pauses inserted.','ducking':'continuous voice-led RMS sidechain','target_lufs':-14,'target_true_peak_dbtp':-1.5,'aac_guard_limiter_dbtp':-2.2,'measured_encoded_lufs':float(final['input_i']),'measured_encoded_true_peak_dbtp':float(final['input_tp']),'lra':float(final['input_lra']),'output':str(output.relative_to(R))}
(R/'research/audio-mix-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False),flush=True)
if abs(report['measured_encoded_lufs']+14)>1 or report['measured_encoded_true_peak_dbtp']>-1.45:raise SystemExit('Audio validation requires review')
print('VOICE_LED_MIX_READY',flush=True)
