"""Analyze only the exact chorus interval explicitly selected by the user."""
from pathlib import Path
import json,subprocess,hashlib,re
import numpy as np,av,imageio_ffmpeg
from faster_whisper import WhisperModel
R=Path(__file__).resolve().parents[1];IN=618.670;OUT=690.000;SRC=R/'assets/audio/muwashah_en_al_andalus.m4a';FF=imageio_ffmpeg.get_ffmpeg_exe()
with av.open(str(SRC)) as c:meta=c.metadata
lrc=[]
for mm,ss,text in re.findall(r'\[(\d+):(\d+(?:\.\d+)?)\]([^\n]+)',meta.get('lyrics','')):
 t=int(mm)*60+float(ss)
 if IN-.8<=t<OUT:lrc.append({'source_start':t,'text':text})
report={'source_in':IN,'source_out':OUT,'exact_duration':OUT-IN,'source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'metadata_lyrics':lrc,'artist_from_metadata':meta.get('artist'),'title_from_metadata':meta.get('title'),'segments':[]}
(R/'research/v5-chorus-analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
raw=subprocess.run([FF,'-v','error','-ss',str(IN),'-i',str(SRC),'-t',str(OUT-IN),'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'],capture_output=True,check=True).stdout
wave=np.frombuffer(raw,dtype='<f4').copy()
print('Exact requested interval decoded: 618.670 to 690.000 seconds',flush=True)
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2,num_workers=1,download_root='/home/user/.cache/alhambra-whisper')
print('Timing model ready',flush=True)
segments,info=model.transcribe(wave,language='ar',beam_size=2,word_timestamps=True,vad_filter=False,condition_on_previous_text=False,initial_prompt='جادك الغيث إذا الغيث همى. يا زمان الوصل بالأندلس. لم يكن وصلك إلا حلما. في الكرى أو خلسة المختلس.')
for s in segments:
 rec={'start':IN+s.start,'end':IN+s.end,'text':s.text,'words':[{'word':w.word,'start':IN+w.start,'end':IN+w.end,'probability':w.probability} for w in (s.words or [])]};report['segments'].append(rec);(R/'research/v5-chorus-analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(rec,ensure_ascii=False),flush=True)
print('EXACT_CHORUS_TIMING_READY',flush=True)
