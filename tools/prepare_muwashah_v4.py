"""Prepare the authorized sung interlude, canonical word cues and revised continuous mix.
All original media remain untouched. Large derived audio is staged and backed up to GitHub.
"""
from pathlib import Path
import json,subprocess,re,hashlib,gc,math
import numpy as np,soundfile as sf
from scipy.signal import resample_poly,stft,find_peaks,correlate
from scipy.ndimage import uniform_filter1d
import imageio_ffmpeg
R=Path(__file__).resolve().parents[1];D=R/'src/muwashah-v4';D.mkdir(parents=True,exist_ok=True)
TMP=Path('/home/user/.cache/alhambra-render/muwashah-v4');TMP.mkdir(parents=True,exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe();SR=48000;FPS=32
CUT_IN=168.40625;CUT_OUT=175.96875;VOICE_END=265.40625;CREDITS=7.0
SONG_IN=564.125;SONG_OUT=609.75;MUSIC_DUR=SONG_OUT-SONG_IN
TOTAL=CUT_IN+MUSIC_DUR+(VOICE_END-CUT_OUT)+CREDITS
SOURCE=R/'assets/audio/muwashah_en_al_andalus.m4a'
# Canonical text is separate from recognition errors. Long sung notes are held, not invented words.
lines=[
 ('جادك الغيث إذا الغيث همى',[(564.76,566.16,'جادك'),(566.16,567.0,'الغيث'),(567.0,567.48,'إذا'),(567.48,568.24,'الغيث'),(568.24,569.74,'همى')]),
 ('يا زمان الوصل بالأندلس',[(573.2,573.76,'يا'),(573.76,575.08,'زمان'),(575.08,575.86,'الوصل'),(575.86,581.90,'بالأندلس')]),
 ('جادك الغيث إذا الغيث همى',[(585.4,586.8,'جادك'),(586.8,587.9,'الغيث'),(587.9,588.5,'إذا'),(588.5,589.8,'الغيث'),(589.8,590.46,'همى')]),
 ('يا زمان الوصل بالأندلس',[(590.46,590.72,'يا'),(590.72,592.54,'زمان'),(592.54,593.34,'الوصل'),(593.34,596.86,'بالأندلس')]),
 ('لم يكن وصلك إلا حلما',[(597.82,598.12,'لم'),(598.12,598.68,'يكن'),(598.68,599.58,'وصلك'),(599.58,600.52,'إلا'),(600.52,601.60,'حلما')]),
 ('في الكرى أو خلسة المختلس',[(601.60,602.10,'في'),(602.10,604.58,'الكرى'),(604.58,604.80,'أو'),(604.80,607.00,'خلسة'),(607.00,608.40,'المختلس')])
]
lyric=[]
for i,(text,words) in enumerate(lines):
 start=words[0][0]-SONG_IN
 until=(lines[i+1][1][0][0]-SONG_IN) if i+1<len(lines) else MUSIC_DUR
 lyric.append({'id':i,'text':text,'start':round(start,5),'until':round(until,5),'words':[{'text':txt,'start':round(a-SONG_IN,5),'end':round(b-SONG_IN,5)} for a,b,txt in words]})
selection={'version':'muwashah-v4','fps':FPS,'width':1920,'height':1080,'song_source_in':SONG_IN,'song_source_out':SONG_OUT,'music_duration':MUSIC_DUR,'music_frames':round(MUSIC_DUR*FPS),'narrator_cut_in':CUT_IN,'narrator_resume_source':CUT_OUT,'narrator_resume_new':CUT_IN+MUSIC_DUR,'source_voice_video_end':VOICE_END,'credit_duration':CREDITS,'credit_frames':round(CREDITS*FPS),'credit_start_new':TOTAL-CREDITS,'duration':TOTAL,'total_frames':round(TOTAL*FPS),'credit_text':'المونتاج والتصميم بواسطة شذى ياسر','performer_from_embedded_metadata':'Sami Yusuf','recording_title':'En al-Ándalus','lyric_lines':lyric,'timing_method':'Embedded synchronized lyrics + two local ASR passes + canonical spelling correction. Short fused sung function words are interpolated within their phrase; not a claim of manual phoneme alignment.','original_narrator_source_unchanged':True,'narrator_in_music_section':False,'song_tempo_changed':False}
(D/'edit-map.json').write_text(json.dumps(selection,ensure_ascii=False,indent=2))
raw_path=TMP/'selected-song-original.wav'
subprocess.run([FF,'-y','-v','error','-ss',str(SONG_IN),'-i',str(SOURCE),'-t',str(MUSIC_DUR),'-vn','-ac','2','-ar',str(SR),'-c:a','pcm_s24le',str(raw_path)],check=True)
def measure(path):
 p=subprocess.run([FF,'-hide_banner','-i',str(path),'-af','loudnorm=I=-14:TP=-2.3:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 return json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',p.stderr)[-1])
original_premix=Path('/home/user/.cache/alhambra-render/premix.wav')
assert original_premix.exists(),'Rebuild the prior deterministic premix with prepare_film_audio.py first.'
base_stats=measure(original_premix);song_stats=measure(raw_path)
print('Original premix LUFS',base_stats['input_i'],'selected song LUFS',song_stats['input_i'],flush=True)
# Match the performance to the narrator's raw mix before one shared final normalization.
base,sr=sf.read(original_premix,dtype='float32',always_2d=True);assert sr==SR
song,sr=sf.read(raw_path,dtype='float32',always_2d=True);assert sr==SR
song_gain_db=float(base_stats['input_i'])-.6-float(song_stats['input_i']);song*=10**(song_gain_db/20)
M=round(MUSIC_DUR*SR);song=song[:M]
if len(song)<M:song=np.pad(song,((0,M-len(song)),(0,0)))
f0=round(.35*SR);f1=round(.65*SR);song[:f0]*=np.sin(np.linspace(0,np.pi/2,f0))[:,None];song[-f1:]*=np.cos(np.linspace(0,np.pi/2,f1))[:,None]
# An actual-audio envelope and spectral onsets, at 32fps, drive the musical typography.
mono=song.mean(axis=1);step=SR//FPS
rms=np.array([np.sqrt(np.mean(mono[i:i+step]**2)) for i in range(0,len(mono),step)])
norm=max(1e-5,np.percentile(rms,97));energy=np.clip(rms/norm,0,1)
small=resample_poly(mono,1,3).astype('float32');f,t,z=stft(small,fs=16000,nperseg=1024,noverlap=864,boundary=None)
mag=np.abs(z);flux=np.maximum(np.diff(mag,axis=1,prepend=mag[:,:1]),0).sum(axis=0);flux=uniform_filter1d(flux,3)
peaks,props=find_peaks(flux,distance=24,prominence=max(1e-8,np.std(flux)*.35));onsets=[float(t[p]) for p in peaks if .1<t[p]<MUSIC_DUR-.1]
strength=[float(min(1,flux[p]/max(1e-6,np.percentile(flux,97)))) for p in peaks if .1<t[p]<MUSIC_DUR-.1]
selection.update(energy=energy.round(4).tolist(),onsets=[{'time':round(a,4),'strength':round(b,4)} for a,b in zip(onsets,strength)],song_gain_db=round(song_gain_db,3))
(D/'music-data.json').write_text(json.dumps(selection,ensure_ascii=False,separators=(',',':')))
# Build a seven-second instrumental coda from the same supplied score and loop phase.
score,s=sf.read(R/'assets/audio/background_music_option_2.mp3',dtype='float32',always_2d=True)
if s!=SR:score=resample_poly(score,SR,s,axis=0).astype('float32')
if score.shape[1]==1:score=np.repeat(score,2,axis=1)
score*=.055/max(.001,float(np.sqrt(np.mean(score**2))))
loop_step=len(score)-8*SR;offset=round(VOICE_END*SR)%loop_step;coda=score[offset:offset+round(CREDITS*SR)].copy()*.41
assert len(coda)==round(CREDITS*SR)
gain=np.minimum(1,(len(coda)-1-np.arange(len(coda)))/(4.2*SR));coda*=np.maximum(0,gain[:,None])
# Only anti-click fades touch the narration junctions; no speech overlaps the sung performance.
pre=base[:round(CUT_IN*SR)].copy();post=base[round(CUT_OUT*SR):round(VOICE_END*SR)].copy();anti=round(.006*SR)
pre[-anti:]*=np.linspace(1,0,anti)[:,None];post[:anti]*=np.linspace(0,1,anti)[:,None]
combined=np.concatenate([pre,song,post,coda]);assert len(combined)==round(TOTAL*SR)
peak=float(np.max(np.abs(combined)));assert peak<1,'Raw premix would clip; reduce gain before writing.'
combined_path=TMP/'revised-premix.wav';sf.write(combined_path,combined,SR,subtype='PCM_24')
# The foreground performance alone is retained for independently playable render checkpoints.
song_path=TMP/'performance-matched.wav';sf.write(song_path,song,SR,subtype='PCM_24')
del base,song,score,pre,post,coda,combined,mag,z,small,mono;gc.collect()
stats=measure(combined_path)
flt=f'loudnorm=I=-14:TP=-2.3:LRA=9:measured_I={stats["input_i"]}:measured_TP={stats["input_tp"]}:measured_LRA={stats["input_lra"]}:measured_thresh={stats["input_thresh"]}:offset={stats["target_offset"]}:linear=true:print_format=json'
final=TMP/'alhambra-muwashah-full-mix.m4a'
subprocess.run([FF,'-y','-hide_banner','-loglevel','error','-i',str(combined_path),'-af',flt,'-ar',str(SR),'-c:a','aac','-b:a','160k',str(final)],check=True)
check=measure(final)
report={'version':'muwashah-v4','duration':TOTAL,'total_frames':selection['total_frames'],'narrator_replaced_source_range':[CUT_IN,CUT_OUT],'singing_source_range':[SONG_IN,SONG_OUT],'singing_inserted_range':[CUT_IN,CUT_IN+MUSIC_DUR],'narrator_resume_source':CUT_OUT,'narrator_resume_new':CUT_IN+MUSIC_DUR,'lyrics_source':'embedded lyrics plus local recognition, with canonical text corrected','raw_premix_sample_peak':peak,'measured_encoded_lufs':float(check['input_i']),'measured_encoded_true_peak_dbtp':float(check['input_tp']),'original_song_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'mix_path':str(final),'mix_sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'narration_overlap_during_song':False,'song_time_stretched':False,'new_credit':'المونتاج والتصميم بواسطة شذى ياسر'}
(R/'research/muwashah-v4-audio-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
assert abs(report['measured_encoded_lufs']+14)<1.2 and report['measured_encoded_true_peak_dbtp']<-.8
job={'kind':'artifact','local_path':str(final),'remote_path':'renders/muwashah-v4/audio/alhambra-muwashah-full-mix.m4a','message':'Preserve the sung interlude mix with the narrator quote removed and narration resumed'}
p=R/'sync-queue/v4-010-audio.json';temp=p.with_suffix('.pending');temp.write_text(json.dumps(job));temp.replace(p)
print('MUWASHAH_AUDIO_READY',json.dumps(report,ensure_ascii=False),flush=True)
