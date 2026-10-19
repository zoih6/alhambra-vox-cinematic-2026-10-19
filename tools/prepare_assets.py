"""Create deterministic lightweight cutouts/textures; never renders a video."""
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter, ImageDraw
import numpy as np
from scipy import ndimage
import json
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'
(A/'textures').mkdir(exist_ok=True);(A/'cutouts').mkdir(exist_ok=True)
rng=np.random.default_rng(17492)
for name,base in [('charcoal',(30,32,29)),('paper',(228,218,194)),('red',(156,53,39))]:
    w,h=1024,576
    fine=rng.normal(0,2.0,(h,w))
    coarse=Image.fromarray(rng.integers(0,255,(36,64),dtype=np.uint8)).resize((w,h),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(2))
    a=np.asarray(coarse).astype(float)/255-.5
    noise=fine+a*(4 if name=='charcoal' else 6)
    rgb=np.clip(np.array(base)[None,None,:]+noise[:,:,None],0,255).astype(np.uint8)
    im=Image.fromarray(rgb);d=ImageDraw.Draw(im)
    for i in range(600):
        x,y=int(rng.integers(w)),int(rng.integers(h));c=tuple(max(0,b-12) for b in base)
        d.line((x,y,x+int(rng.integers(1,4)),y+1),fill=c,width=1)
    im.save(A/f'textures/{name}.jpg',quality=88,optimize=True)
# Reusable metaphor prop: retain chromatic stone; remove the neutral studio backdrop/shadow.
im=Image.open(A/'generated/stone-metaphor.jpg').convert('RGB')
a=np.array(im);v=a.astype(np.int16)
fg=((v[:,:,0]-v[:,:,2])>24)&((v.max(axis=2)-v.min(axis=2))>28)
labels,n=ndimage.label(fg)
counts=np.bincount(labels.ravel());counts[0]=0
fg=labels==counts.argmax();fg=ndimage.binary_fill_holes(ndimage.binary_closing(fg,iterations=2))
m=Image.fromarray(fg.astype(np.uint8)*255).filter(ImageFilter.GaussianBlur(.55))
rgba=Image.merge('RGBA',(*im.split(),m)).crop(m.getbbox());rgba.thumbnail((1320,1000));rgba.save(A/'cutouts/stone.webp',quality=94,method=6)
# The genuine panoramic photo is isolated from its pale sky, not redrawn.
im=Image.open(A/'photos/palace-overview.jpg').convert('RGB')
a=np.array(im);white=(a.min(axis=2)>205)&((a.max(axis=2)-a.min(axis=2))<47)
labels,_=ndimage.label(white)
boundary=np.unique(np.concatenate([labels[0,:],labels[:100,0],labels[:100,-1]]));bg=np.isin(labels,boundary[boundary>0])
mask=(~bg).astype(np.uint8)*255
# Remove isolated pale sky pockets between upper branches, preserving the actual building colors.
upper=np.arange(a.shape[0])[:,None] < int(a.shape[0]*.55)
sky_pockets=(a.min(axis=2)>225)&((a.max(axis=2)-a.min(axis=2))<30)&upper
mask[sky_pockets]=0
# Crop the lower foreground into a tactile tear, retaining the real skyline.
h,w=mask.shape
ycut=int(h*.88)
for x in range(w):
    yy=int(ycut+18*np.sin(x*.031)+9*np.sin(x*.087))
    mask[yy:,x]=0
mask=Image.fromarray(mask).filter(ImageFilter.GaussianBlur(.5))
rgba=Image.merge('RGBA',(*im.split(),mask));bb=mask.getbbox();rgba=rgba.crop(bb);rgba.thumbnail((2200,1100));rgba.save(A/'cutouts/palace.webp',quality=94,method=6)
# A neutral treatment preserves original epigraphy: no generated or substituted text.
im=Image.open(A/'photos/nasrid-inscription.jpg').convert('RGB')
im.thumbnail((1600,1600));im.save(A/'cutouts/inscription.webp',quality=94,method=6)
p=ROOT/'research/asset-provenance-pexels.json'
if p.exists():
    data=json.loads(p.read_text())
    for x in data:
        x['author']='Enrique' if x['id']==13341148 else 'Miquel Rosselló Calafell'
        x['status']='source_and_license_page_checked'
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2))
print('Prepared paper textures and genuine-photo cutouts. No video rendered.')
