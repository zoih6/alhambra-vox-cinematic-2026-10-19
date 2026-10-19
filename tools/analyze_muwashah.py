"""Inspect the supplied recording locally; no voice generation and no changes to originals."""
from pathlib import Path
import json,subprocess,time,hashlib,requests
import numpy as np
import imageio_ffmpeg
from faster_whisper import WhisperModel
R=Path(__file__).resolve().parents[1];source=R/'assets/audio/muwashah_en_al_andalus.m4a'
entry=requests.get('https://api.github.com/repos/zoih6/alhambra-film-assets/contents/audio/muwashah_en_al_andalus.m4a',timeout=30);entry.raise_for_status();meta=entry.json();data=source.read_bytes();blob=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest();assert blob==meta['sha']
(R/'research/muwashah-current-source.json').write_text(json.dumps({'source_url':meta['download_url'],'repository_path':meta['path'],'git_blob_sha':blob,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'verified_current_remote':True},indent=2))
ff=imageio_ffmpeg.get_ffmpeg_exe();raw=subprocess.run([ff,'-v','error','-ss','560','-i',str(source),'-t','56','-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'],capture_output=True,check=True).stdout
wave=np.frombuffer(raw,dtype='<f4').copy()
print('SOURCE_VERIFIED; analyzing the 09:20–10:16 vocal refrain of the actual supplied performance',flush=True)
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2,num_workers=1,download_root='/home/user/.cache/alhambra-whisper')
segments,info=model.transcribe(wave,language='ar',beam_size=2,word_timestamps=True,vad_filter=False,condition_on_previous_text=False,initial_prompt='موشح أندلسي. جادك الغيث إذا الغيث همى. يا زمان الوصل بالأندلس. لم يكن وصلك إلا حلما. في الكرى أو خلسة المختلس.')
result={'status':'machine_singing_timing_candidates','source':'assets/audio/muwashah_en_al_andalus.m4a','analyzed_range':[560,616],'segments':[]}
for s in segments:
 a={'start':s.start+560,'end':s.end+560,'text':s.text,'avg_logprob':s.avg_logprob,'no_speech_prob':s.no_speech_prob,'words':[{'start':w.start+560,'end':w.end+560,'word':w.word,'probability':w.probability} for w in (s.words or [])]};result['segments'].append(a);print(f'{s.start+560:.2f} - {s.end+560:.2f}: {s.text}',flush=True);(R/'research/muwashah-analysis-v4.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('MUWASHAH_ANALYSIS_READY',flush=True)
