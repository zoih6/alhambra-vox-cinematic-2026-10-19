"""Exact user-selected chorus, 10:18.670–11:30.000. No tempo or voice substitution."""
from pathlib import Path
import json,subprocess,re,gc,hashlib
import numpy as np,soundfile as sf
from scipy.signal import stft,find_peaks,resample_poly
from scipy.ndimage import uniform_filter1d
import imageio_ffmpeg
R=Path(__file__).resolve().parents[1];D=R/'src/layered-v5';TMP=Path('/home/user/.cache/alhambra-render/layered-v5');TMP.mkdir(parents=True,exist_ok=True)
C=json.loads((D/'layer-plan.json').read_text());ASR=json.loads((R/'research/v5-chorus-analysis.json').read_text());FF=imageio_ffmpeg.get_ffmpeg_exe();SR=48000
canonical=[['جادك','الغيث','إذا','الغيث','همى'],['يا','زمان','الوصل','بالأندلس'],['لم','يكن','وصلك','إلا','حلما'],['في','الكرى','أو','خلسة','المختلس']]
w=ASR['segments'][0]['words'];groups=[w[:5],w[5:9],w[9:14],w[14:19]]
groups+=[ASR['segments'][1]['words'],ASR['segments'][2]['words'],ASR['segments'][3]['words'],ASR['segments'][4]['words'],ASR['segments'][5]['words'],ASR['segments'][6]['words'],ASR['segments'][7]['words']]
texts=canonical+canonical+[canonical[1],canonical[1],canonical[1]]
starts=[618.90,624.47,630.01,636.15,641.66,647.61,653.12,658.93,664.41,669.95,675.20]
lines=[]
for i,(text,raw) in enumerate(zip(texts,groups)):
 raw=[dict(x) for x in raw]
 if i in [5,8]:raw=raw[:3]+[dict(raw[3],end=raw[-1]['end'])]
 if i==7:
  raw=[raw[0],raw[1],{'start':raw[2]['start'],'end':raw[2]['start']+.25},dict(raw[2],start=raw[2]['start']+.25),raw[3]]
 assert len(raw)==len(text),(i,raw,text)
 raw[0]['start']=starts[i]
 if i==10:raw[0]['end']=675.73
 words=[{'text':txt,'start':round(a['start']-C['song_source_in'],5),'end':round(max(a['end'],a['start']+.12)-C['song_source_in'],5)} for txt,a in zip(text,raw)]
 lines.append({'id':i,'text':' '.join(text),'start':words[0]['start'],'until':round((starts[i+1]-C['song_source_in']) if i+1<len(starts) else C['song_video_seconds'],5),'words':words,'world':['rain-arch','palace-memory','mirror-dream','ink-geometry'][i%4] if i<8 else 'palace-coda'})
rawpath=TMP/'requested-chorus-original.wav'
subprocess.run([FF,'-y','-v','error','-ss',f'{C["song_source_in"]:.3f}','-i',str(R/'assets/audio/muwashah_en_al_andalus.m4a'),'-t',f'{C["song_exact_seconds"]:.3f}','-vn','-ac','2','-ar','48000','-c:a','pcm_s24le',str(rawpath)],check=True)
def measure(path):
 p=subprocess.run([FF,'-hide_banner','-i',str(path),'-af','loudnorm=I=-14:TP=-2.3:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 return json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',p.stderr)[-1])
basepath=Path('/home/user/.cache/alhambra-render/premix.wav');assert basepath.exists()
bs=measure(basepath);ss=measure(rawpath);base,sr=sf.read(basepath,dtype='float32',always_2d=True);song,_=sf.read(rawpath,dtype='float32',always_2d=True)
exact_samples=round(C['song_exact_seconds']*SR);song=song[:exact_samples];assert len(song)==exact_samples
song_db=float(bs['input_i'])-.6-float(ss['input_i']);song*=10**(song_db/20)
# Only the outer instrumental edges are tapered; the exact requested source interval is retained.
a=round(.035*SR);b=round(.25*SR);song[:a]*=np.linspace(0,1,a)[:,None];song[-b:]*=np.linspace(1,0,b)[:,None]
N=round(C['song_video_seconds']*SR);song=np.pad(song,((0,N-len(song)),(0,0)))
mono=song.mean(axis=1);hop=SR//32;energy=np.array([np.sqrt(np.mean(mono[j:j+hop]**2)) for j in range(0,len(mono),hop)]);energy=np.clip(energy/max(1e-5,np.percentile(energy,96)),0,1)
small=resample_poly(mono,1,3);freq,ts,z=stft(small,fs=16000,nperseg=1024,noverlap=864,boundary=None);mag=np.abs(z);flux=np.maximum(np.diff(mag,axis=1,prepend=mag[:,:1]),0).sum(axis=0);flux=uniform_filter1d(flux,3);ix,_=find_peaks(flux,distance=26,prominence=max(1e-8,np.std(flux)*.35));norm=max(1e-7,np.percentile(flux,97))
M={'source_in':C['song_source_in'],'source_out':C['song_source_out'],'exact_duration':C['song_exact_seconds'],'video_duration':C['song_video_seconds'],'frames':C['song_frames'],'padding_seconds':C['song_padding_seconds'],'lines':lines,'energy':energy.round(4).tolist(),'onsets':[{'t':round(float(ts[i]),4),'strength':round(float(min(1,flux[i]/norm)),4)} for i in ix if 0<ts[i]<C['song_exact_seconds']],'timing_status':'embedded lyric times plus local word recognition; canonical text corrected; fused sung syllables locally apportioned','song_gain_db':song_db}
(D/'chorus-data.json').write_text(json.dumps(M,ensure_ascii=False,separators=(',',':')))
# Preserve the approved narration mix outside its spoken two-line quote.
pre=base[:round(C['narration_cut_in']*SR)].copy();post=base[round(C['narration_resume_source']*SR):round(265.40625*SR)].copy();fade=round(.006*SR);pre[-fade:]*=np.linspace(1,0,fade)[:,None];post[:fade]*=np.linspace(0,1,fade)[:,None]
score,rate=sf.read(R/'assets/audio/background_music_option_2.mp3',dtype='float32',always_2d=True)
if rate!=SR:score=resample_poly(score,SR,rate,axis=0).astype('float32')
if score.shape[1]==1:score=np.repeat(score,2,axis=1)
score*=.055/max(.001,float(np.sqrt(np.mean(score**2))));step=len(score)-8*SR;offset=round(265.40625*SR)%step;coda=score[offset:offset+7*SR].copy()*.41;coda*=np.maximum(0,np.minimum(1,(len(coda)-1-np.arange(len(coda)))/(4.2*SR)))[:,None]
combined=np.concatenate([pre,song,post,coda]);assert len(combined)==round(C['duration']*SR);peak=float(np.max(np.abs(combined)));assert peak<1
premix=TMP/'v5-premix.wav';sf.write(premix,combined,SR,subtype='PCM_24');sf.write(TMP/'chorus-matched.wav',song,SR,subtype='PCM_24')
del base,score,pre,post,song,coda,combined,mono,mag,z,small;gc.collect()
st=measure(premix);flt=f'loudnorm=I=-14:TP=-2.3:LRA=9:measured_I={st["input_i"]}:measured_TP={st["input_tp"]}:measured_LRA={st["input_lra"]}:measured_thresh={st["input_thresh"]}:offset={st["target_offset"]}:linear=true:print_format=json'
final=TMP/'alhambra-layered-v5-full-mix.m4a';subprocess.run([FF,'-y','-v','error','-i',str(premix),'-af',flt,'-ar','48000','-c:a','aac','-b:a','160k',str(final)],check=True);out=measure(final)
report={'version':'layered-v5','exact_source_interval':[C['song_source_in'],C['song_source_out']],'exact_excerpt_seconds':C['song_exact_seconds'],'video_padding_silence_seconds':C['song_padding_seconds'],'music_movie_interval':[C['narration_cut_in'],C['narration_resume_new']],'narrator_during_song':False,'tempo_changed':False,'duration':C['duration'],'frames':C['total_frames'],'measured_encoded_lufs':float(out['input_i']),'measured_encoded_true_peak_dbtp':float(out['input_tp']),'source_recording_sha256':hashlib.sha256((R/'assets/audio/muwashah_en_al_andalus.m4a').read_bytes()).hexdigest(),'mix_path':str(final),'mix_sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'raw_premix_peak':peak}
(R/'research/v5-audio-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));assert abs(report['measured_encoded_lufs']+14)<1.2 and report['measured_encoded_true_peak_dbtp']<-1
job={'kind':'artifact','local_path':str(final),'remote_path':'renders/layered-v5/audio/'+final.name,'message':'Preserve exact 10:18.670–11:30.000 chorus and the revised continuous mix'}
p=R/'sync-queue/v5-010-audio.json';p.write_text(json.dumps(job));print('V5_AUDIO_READY',json.dumps(report,ensure_ascii=False),flush=True)
