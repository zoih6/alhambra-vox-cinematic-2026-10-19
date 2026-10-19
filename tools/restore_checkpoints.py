"""Restore verified render checkpoints from the project's public GitHub repository.
No credential is needed to retrieve already-public files. Nothing is deleted.
Usage: python3 tools/restore_checkpoints.py --destination /path/with/enough/space
"""
from pathlib import Path
import argparse,json,hashlib
import requests
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--destination',required=True);a=p.parse_args()
dest=Path(a.destination);dest.mkdir(parents=True,exist_ok=True)
backup=json.loads((R/'research/github-backup.json').read_text());repo=backup['repository_full_name']
manifest=json.loads((R/'research/render-checkpoints.json').read_text())
for entry in manifest['completed_segments']:
    file=dest/Path(entry['repository_path']).name
    if file.exists() and hashlib.sha256(file.read_bytes()).hexdigest()==entry['sha256']:
        print('verified existing',file.name);continue
    # Use the recorded checkpoint commit when available, never an invented revision.
    revision=entry.get('backup_commit') or backup['last_commit']
    url=f'https://raw.githubusercontent.com/{repo}/{revision}/{entry["repository_path"]}'
    response=requests.get(url,timeout=90);response.raise_for_status()
    if hashlib.sha256(response.content).hexdigest()!=entry['sha256']:raise SystemExit('Checksum mismatch: '+file.name)
    file.write_bytes(response.content);print('restored',file.name,entry['bytes'])
print('All recorded checkpoints restored and SHA-256 verified.')
