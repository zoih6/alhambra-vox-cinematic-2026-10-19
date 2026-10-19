"""Narrow re-alignment of sung words where melisma confused the first ASR pass."""
from pathlib import Path
import json,subprocess,numpy as np,imageio_ffmpeg
from faster_whisper import WhisperModel
R=Path(__file__).resolve().parents[1];ff=imageio_ffmpeg.get_ffmpeg_exe();source=R/'assets/audio/muwashah_en_al_andalus.m4a'
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2,num_workers=1,download_root='/home/user/.cache/alhambra-whisper')
result=[]
for start,end,text in [(573.2,584.9,'يا زمان الوصل بالأندلس'),(590.2,597.3,'يا زمان الوصل بالأندلس'),(601.4,609.5,'في الكرى أو خلسة المختلس')]:
 raw=subprocess.run([ff,'-v','error','-ss',str(start),'-i',str(source),'-t',str(end-start),'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'],capture_output=True,check=True).stdout
 audio=np.frombuffer(raw,dtype='<f4').copy();segments,info=model.transcribe(audio,language='ar',beam_size=3,word_timestamps=True,vad_filter=False,condition_on_previous_text=False,initial_prompt=text)
 for s in segments:
  rec={'source_window':[start,end],'canonical_line':text,'text':s.text,'start':start+s.start,'end':start+s.end,'words':[{'word':w.word,'start':start+w.start,'end':start+w.end,'probability':w.probability} for w in (s.words or [])]};result.append(rec);print(json.dumps(rec,ensure_ascii=False),flush=True)
 (R/'research/muwashah-refined-words.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('REFINED_WORD_TIMING_READY',flush=True)
