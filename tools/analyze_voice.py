"""Local analysis only. Does not synthesize, edit, or render any project media."""
from pathlib import Path
import json, os, time
from faster_whisper import WhisperModel
ROOT = Path(__file__).resolve().parents[1]
print('Loading multilingual timing model (cache excluded from workspace snapshot)', flush=True)
model = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=4, num_workers=1, download_root='/home/user/.cache/alhambra-whisper')
print('Model ready; extracting word-timing candidates from original voiceover', flush=True)
import soundfile as sf
from scipy.signal import resample_poly
wave, sr = sf.read(str(ROOT/'assets/audio/voiceover_narration.mp3'), dtype='float32')
if wave.ndim > 1: wave = wave.mean(axis=1)
if sr != 16000: wave = resample_poly(wave, 16000, sr).astype('float32')
segments, info = model.transcribe(wave, language='ar', beam_size=3, word_timestamps=True, vad_filter=True, initial_prompt='قصر الحمراء، هضبة السبيكة، غرناطة، الأندلس، محمد بن يوسف بن نصر، بني الأحمر، نهر دارو، بهو الريحان، بهو الأسود، ابن زمرك، المقرنصات، لسان الدين بن الخطيب، أبو عبد الله الصغير.')
result = {'status':'machine_timing_candidates_not_human_verified', 'language':info.language, 'duration_seconds':info.duration, 'segments':[]}
for segment in segments:
    item={'start':segment.start, 'end':segment.end,'text':segment.text,'words':[{'start':w.start,'end':w.end,'word':w.word,'probability':w.probability} for w in (segment.words or [])]}
    result['segments'].append(item)
    print(f'{segment.start:.2f} - {segment.end:.2f} {segment.text}', flush=True)
    (ROOT/'research/voice-timing-machine.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('Voice analysis complete. Canonical wording remains the user-supplied script.', flush=True)
