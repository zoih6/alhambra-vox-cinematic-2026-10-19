"""Inspect snapshot-eligible workspace storage. Does not delete or move anything."""
from pathlib import Path
import os,json,shutil
ROOT=Path('/home/user')
EXCLUDED={'.arena','.cache','.local','.mypy_cache','.next','.nox','.npm','.nuxt','.output','.parcel-cache','.pytest_cache','.ruff_cache','.svelte-kit','.tox','.turbo','.venv','.vite','__pycache__','build','coverage','dist','node_modules','out','target'}
SENSITIVE={'.git/config','.git/credentials','.git-credentials','.netrc'}
total=0;count=0;by_dir={}
for folder,dirs,files in os.walk(ROOT):
 dirs[:]=[d for d in dirs if d not in EXCLUDED]
 for name in files:
  p=Path(folder)/name;rel=p.relative_to(ROOT);s=str(rel)
  if p.is_symlink() or s in SENSITIVE or s.endswith('/.git/config') or s.endswith('/.git/credentials'):continue
  try:size=p.stat().st_size
  except OSError:continue
  total+=size;count+=1;group=rel.parts[0];by_dir[group]=by_dir.get(group,0)+size
report={'snapshot_eligible_bytes':total,'snapshot_eligible_mib':round(total/1024**2,2),'files':count,'soft_limit_mib':90,'stop_limit_mib':118,'below_stop_limit':total<118*1024**2,'by_top_level_mib':{k:round(v/1024**2,2) for k,v in sorted(by_dir.items())},'system_disk_free_gib':round(shutil.disk_usage(ROOT).free/1024**3,2),'project_video_files':[str(p.relative_to(ROOT/'alhambra-vox')) for ext in ['*.mp4','*.webm','*.mov'] for p in (ROOT/'alhambra-vox').rglob(ext)]}
(ROOT/'alhambra-vox/research/storage-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if not report['below_stop_limit']:raise SystemExit('STOP: persistent workspace exceeds the project safety threshold')
