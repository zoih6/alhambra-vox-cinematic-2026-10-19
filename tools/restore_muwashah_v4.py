"""Restore the exact revised-film pieces from public, recorded Git commits; no token needed.
Usage: python3 tools/restore_muwashah_v4.py --destination /home/user/.cache/alhambra-restore-v4
This downloads existing rendered files; it does not regenerate or delete media.
"""
from pathlib import Path
import argparse,json,hashlib,requests
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--destination',required=True);a=p.parse_args();dest=Path(a.destination);dest.mkdir(parents=True,exist_ok=True)
backup=json.loads((R/'research/github-backup.json').read_text());manifest=json.loads((R/'research/muwashah-v4-render.json').read_text());repo=backup['repository_full_name']
playlist=[]
for i,entry in enumerate(manifest['pieces']):
    file=dest/f'{i+1:03}-{entry["name"]}.mp4'
    if not file.exists() or hashlib.sha256(file.read_bytes()).hexdigest()!=entry['sha256']:
        revision=entry['backup_commit'];url=f'https://raw.githubusercontent.com/{repo}/{revision}/{entry["repository_path"]}'
        response=requests.get(url,timeout=90);response.raise_for_status()
        if hashlib.sha256(response.content).hexdigest()!=entry['sha256']:raise SystemExit('Checksum mismatch: '+file.name)
        file.write_bytes(response.content)
    print('Verified',file.name,entry['frames'],'frames')
    playlist.extend([f"file '{file.resolve()}'",f'duration {entry["frames"]/32:.8f}'])
(dest/'restored-pieces.txt').write_text('\n'.join(playlist)+'\n')
audio=json.loads((R/'research/muwashah-v4-audio-report.json').read_text())
if audio.get('mix_backup_commit'):
    file=dest/'alhambra-muwashah-full-mix.m4a';url=f'https://raw.githubusercontent.com/{repo}/{audio["mix_backup_commit"]}/{audio["mix_repository_path"]}'
    if not file.exists() or hashlib.sha256(file.read_bytes()).hexdigest()!=audio['mix_sha256']:
        response=requests.get(url,timeout=90);response.raise_for_status();assert hashlib.sha256(response.content).hexdigest()==audio['mix_sha256'];file.write_bytes(response.content)
    print('Verified continuous audio mix.')
print('Restored all recorded pieces. The assembly recipe in render_muwashah_v4.py removes each piece\'s unused audio before concatenating its video and muxing the continuous mix.')
