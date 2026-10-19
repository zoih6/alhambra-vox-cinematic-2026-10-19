"""Explicitly authorized public-project backup. Credential is read from process memory only.
No credential is written to git config, source files, logs, job files, or the repository.
Only this project's allowlisted paths and its two vendor skills can be published.
"""
from pathlib import Path
import os,sys,json,time,shutil,subprocess,hashlib,base64,re
import requests
ROOT=Path(__file__).resolve().parents[1]
WORK=Path('/home/user/.cache/alhambra-github-backup')
GIT=WORK/'repository'
QUEUE=ROOT/'sync-queue';QUEUE.mkdir(exist_ok=True)
STATUS=ROOT/'research/github-backup.json'
TOKEN=os.environ.pop('GITHUB_TOKEN','')
if not TOKEN:
    print('GITHUB_AUTH_MISSING: use a temporary environment credential; do not write it to a file.',flush=True);sys.exit(2)
BASIC=base64.b64encode(('x-access-token:'+TOKEN).encode()).decode()
SESSION=requests.Session();SESSION.headers.update({'Authorization':'Bearer '+TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'})
BASE='https://api.github.com'
state={'status':'authenticating','public_repository':True,'token_persisted':False,'uploaded_artifacts':[],'last_commit':None}
def save():
    STATUS.write_text(json.dumps(state,ensure_ascii=False,indent=2))
def log(s):
    print(str(s).replace(TOKEN,'[REDACTED]').replace(BASIC,'[REDACTED]'),flush=True)
def api(method,path,**kw):
    r=SESSION.request(method,BASE+path,timeout=40,allow_redirects=False,**kw)
    if r.status_code>=300:
        try:message=r.json().get('message','API request failed')
        except Exception:message='API request failed'
        raise RuntimeError(f'GitHub {r.status_code}: {message}')
    return r.json() if r.content else {}
def git(*args,auth=False):
    env=os.environ.copy();env['GIT_TERMINAL_PROMPT']='0'
    if auth:
        env['GIT_CONFIG_COUNT']='1';env['GIT_CONFIG_KEY_0']='http.https://github.com/.extraHeader';env['GIT_CONFIG_VALUE_0']='AUTHORIZATION: basic '+BASIC
    for attempt in range(4):
        r=subprocess.run(['git',*args],cwd=GIT,env=env,capture_output=True,text=True,timeout=240)
        if not r.returncode:return r.stdout.strip()
        message=(r.stderr or r.stdout)[-2000:]
        transient=args and args[0]=='push' and any(x in message.lower() for x in ['fatal error in commit_refs','502 bad gateway','http 502','http 503','remote end hung up'])
        if not transient or attempt==3:raise RuntimeError(message)
        log(f'Retrying transient GitHub push failure, attempt {attempt+2}/4; no force push and no new render.')
        time.sleep([2,5,12][attempt])
EXCLUDE={'__pycache__','.cache','.local','.git','node_modules','out','build','dist','sync-queue'}
SECRET_PATTERN=re.compile(rb'(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)')
def copy_safe(src,dst):
    if src.is_symlink() or src.name.startswith('.env') or src.name in {'.netrc','.git-credentials'}:return
    data=src.read_bytes()
    if TOKEN.encode() in data or SECRET_PATTERN.search(data):raise RuntimeError('Secret-scan stopped publication of '+str(src.relative_to(ROOT)) if ROOT in src.parents else 'Secret scan stopped publication')
    if len(data)>95_000_000:raise RuntimeError('Artifact is too large for normal git backup; use a release asset or split it: '+src.name)
    dst.parent.mkdir(parents=True,exist_ok=True)
    if not dst.exists() or dst.stat().st_size!=len(data) or hashlib.sha256(dst.read_bytes()).digest()!=hashlib.sha256(data).digest():dst.write_bytes(data)
def snapshot_tree(src,dst):
    for folder,dirs,files in os.walk(src):
        dirs[:]=[x for x in dirs if x not in EXCLUDE]
        for name in files:
            p=Path(folder)/name
            copy_safe(p,dst/p.relative_to(src))
def snapshot():
    snapshot_tree(ROOT,GIT)
    for name in ['ai-film-studio','motion-reel']:
        snapshot_tree(Path('/home/user/skills')/name,GIT/'vendor'/name)
    (GIT/'.gitignore').write_text('.env\n.env.*\nnode_modules/\n__pycache__/\n.cache/\nsync-queue/\n')
def commit_push(message):
    git('add','--all')
    if git('status','--porcelain'):
        git('commit','-m',message);git('push','-u','origin','main',auth=True)
    state['last_commit']=git('rev-parse','HEAD');state['status']='watching_for_checkpoints';save()
    log('BACKUP_COMMIT '+state['last_commit'][:12]+' '+message)
try:
    me=api('GET','/user');login=me['login'];state['owner']=login
    existing=json.loads(STATUS.read_text()) if STATUS.exists() else {}
    if existing.get('repository_full_name') and existing.get('owner')==login:
        # Resume only the repository ID returned by a prior successful API call in this project.
        info=api('GET','/repos/'+existing['repository_full_name'])
        if info.get('id')!=existing.get('repository_id'):raise RuntimeError('Repository identity mismatch')
    else:
        base_name='alhambra-vox-cinematic-2026-10-19'
        for i in range(1,10):
            name=base_name if i==1 else base_name+f'-{i:02d}'
            response=SESSION.post(BASE+'/user/repos',json={'name':name,'description':'Alhambra — A Poem in Stone. Arabic cinematic motion documentary, reproducible 1920x1080 / 32fps, sources and render checkpoints.','private':False,'auto_init':False},timeout=40,allow_redirects=False)
            if response.status_code==201:info=response.json();break
            if response.status_code==422 and 'already exists' in response.text.lower():continue
            try:msg=response.json().get('message','repository creation failed')
            except Exception:msg='repository creation failed'
            raise RuntimeError(f'GitHub create repository {response.status_code}: {msg}')
        else:raise RuntimeError('No unused repository name found')
    state.update(repository_id=info['id'],repository_full_name=info['full_name'],repository_url=info['html_url'],clone_url=info['clone_url'],owner=login,status='initial_backup')
    if existing.get('repository_id')==info['id']:
        state['uploaded_artifacts']=existing.get('uploaded_artifacts',[])
    save();log('PUBLIC_REPOSITORY '+info['html_url'])
    GIT.mkdir(parents=True,exist_ok=True)
    if not (GIT/'.git').exists():
        git('init','-b','main');git('remote','add','origin',info['clone_url']);git('config','pack.windowMemory','64m');git('config','pack.threads','1')
        if existing.get('last_commit'):
            git('fetch','--depth','1','origin','main',auth=True);git('reset','--hard','origin/main')
    git('config','user.name','AI Film Studio');git('config','user.email',f'{me["id"]}+{login}@users.noreply.github.com')
    snapshot();commit_push('Preserve approved project sources, assets, narration and production skills')
    log('INITIAL_BACKUP_COMPLETE')
    seen=set()
    while True:
        for p in sorted(QUEUE.glob('*.json')):
            if p.name in seen:continue
            job=json.loads(p.read_text())
            if job.get('status')=='uploaded':seen.add(p.name);continue
            kind=job.get('kind','artifact')
            if kind=='artifact':
                local=Path(job['local_path']).resolve();allowed=[ROOT.resolve(),Path('/home/user/.cache/alhambra-render').resolve()]
                if not any(x in local.parents for x in allowed):raise RuntimeError('Checkpoint path outside allowed project staging roots')
                dest=Path(job['remote_path'])
                if dest.is_absolute() or '..' in dest.parts:raise RuntimeError('Unsafe repository artifact path')
                copy_safe(local,GIT/dest)
                entry={'path':str(dest),'bytes':local.stat().st_size,'sha256':hashlib.sha256(local.read_bytes()).hexdigest(),'source_name':local.name}
                state['uploaded_artifacts']=[a for a in state['uploaded_artifacts'] if a['path']!=entry['path']]+[entry]
                save();snapshot();commit_push(job.get('message','Preserve rendered checkpoint '+local.name))
                log('ARTIFACT_UPLOADED '+str(dest))
            elif kind=='release':
                local=Path(job['local_path']).resolve()
                if not (ROOT.resolve() in local.parents or Path('/home/user/.cache/alhambra-render').resolve() in local.parents):raise RuntimeError('Unsafe release asset path')
                digest=hashlib.sha256(local.read_bytes()).hexdigest();tag=job.get('tag','v5-layered-motion');repo=state['repository_full_name']
                try:release=api('GET','/repos/'+repo+'/releases/tags/'+tag)
                except RuntimeError as exc:
                    if not str(exc).startswith('GitHub 404:'):raise
                    release=api('POST','/repos/'+repo+'/releases',json={'tag_name':tag,'target_commitish':'main','name':job.get('release_name','Alhambra — layered-motion edition'),'body':job.get('release_body','Full-quality film master. Sources, credits and independently preserved render checkpoints are in this repository.'),'draft':False,'prerelease':False})
                assets=api('GET',f'/repos/{repo}/releases/{release["id"]}/assets')
                asset=next((a for a in assets if a.get('digest')=='sha256:'+digest),None)
                name=local.name
                if asset is None:
                    if any(a['name']==name for a in assets):name=local.stem+'-'+digest[:8]+local.suffix
                    upload=release['upload_url'].split('{')[0]
                    if not upload.startswith('https://uploads.github.com/'):raise RuntimeError('Untrusted release upload host')
                    with local.open('rb') as stream:
                        response=SESSION.post(upload,params={'name':name},data=stream,headers={'Content-Type':'video/mp4','Content-Length':str(local.stat().st_size)},timeout=300,allow_redirects=False)
                    if response.status_code!=201:raise RuntimeError('Release upload failed: '+str(response.status_code))
                    asset=response.json()
                record={'release_id':release['id'],'asset_id':asset['id'],'tag':tag,'name':asset['name'],'bytes':local.stat().st_size,'sha256':digest,'download_url':asset['browser_download_url'],'release_url':release['html_url']}
                relpath=Path(job.get('remote_path','renders/final/v5-master-download.json'))
                if relpath.is_absolute() or '..' in relpath.parts:raise RuntimeError('Unsafe release metadata path')
                dest=GIT/relpath;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(record,ensure_ascii=False,indent=2))
                (ROOT/'research/v5-release-published.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
                entry={'path':'releases/'+tag+'/'+asset['name'],'bytes':local.stat().st_size,'sha256':digest,'download_url':asset['browser_download_url'],'source_name':local.name}
                state['uploaded_artifacts']=[a for a in state['uploaded_artifacts'] if a['path']!=entry['path']]+[entry]
                save();snapshot();commit_push(job.get('message','Preserve full-quality release master'))
                job['download_url']=asset['browser_download_url'];log('RELEASE_ASSET_UPLOADED '+asset['browser_download_url'])
            elif kind in {'snapshot','finish'}:
                snapshot();commit_push(job.get('message','Preserve production checkpoint'))
            else:raise RuntimeError('Unknown checkpoint job kind')
            job.update(status='uploaded',commit=state['last_commit']);p.write_text(json.dumps(job,ensure_ascii=False,indent=2));seen.add(p.name)
            if kind=='finish':
                state['status']='complete';save();log('ALL_BACKUPS_COMPLETE');sys.exit(0)
        time.sleep(2)
except Exception as e:
    safe=str(e).replace(TOKEN,'[REDACTED]').replace(BASIC,'[REDACTED]')
    state['status']='failed';state['error']=safe;save();log('BACKUP_FAILED '+safe);sys.exit(1)
