"""Restore public v5 media with SHA-256 verification; no credential is required.
Usage:
  python3 tools/restore_layered_v5.py --master --destination /home/user/.cache/v5-restored
  python3 tools/restore_layered_v5.py --segments --destination /home/user/.cache/v5-restored
Nothing is deleted. Use runtime storage for large media to respect the snapshot budget.
"""
from pathlib import Path
import argparse,json,hashlib,requests
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--destination',required=True);p.add_argument('--master',action='store_true');p.add_argument('--segments',action='store_true');a=p.parse_args()
if not(a.master or a.segments):p.error('Choose --master or --segments')
dest=Path(a.destination);dest.mkdir(parents=True,exist_ok=True)
def fetch(url,path,expected):
 if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==expected:print('Verified existing',path.name);return
 temporary=path.with_suffix(path.suffix+'.partial');h=hashlib.sha256()
 with requests.get(url,stream=True,timeout=90) as resp:
  resp.raise_for_status()
  with temporary.open('wb') as f:
   for block in resp.iter_content(2*1024*1024):
    if block:f.write(block);h.update(block)
 if h.hexdigest()!=expected:raise SystemExit('Checksum mismatch; partial retained: '+str(temporary))
 temporary.replace(path);print('Restored and verified',path.name)
S=json.loads((R/'research/v5-render-manifest.json').read_text())
if a.master:
 release=json.loads((R/'research/v5-release-published.json').read_text());fetch(release['download_url'],dest/release['name'],release['sha256'])
if a.segments:
 repo=json.loads((R/'research/github-backup.json').read_text())['repository_full_name']
 for s in S['segments']:
  url=f'https://raw.githubusercontent.com/{repo}/{s["backup_commit"]}/{s["repository_path"]}'
  fetch(url,dest/f'part-{s["part"]:03}.mp4',s['sha256'])
print('Recovery complete. Continuous audio and assembly instructions are preserved in the repository.')
