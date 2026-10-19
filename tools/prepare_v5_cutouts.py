"""Clean chroma mattes and reversible sub-layer splits. Originals are retained."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,json
from scipy import ndimage
R=Path(__file__).resolve().parents[1];D=R/'assets/layered-v5';D.mkdir(parents=True,exist_ok=True)
items={'founder':'v5-founder-portrait','poet':'v5-poet-portrait','hands':'v5-foundation-hands','key':'v5-medieval-key'}
manifest={'assets':{},'historical_people_are_imagined_illustrations':True,'source_images_retained':True}
for key,stem in items.items():
 src=R/f'assets/generated/{stem}.jpg';im=Image.open(src).convert('RGB');a=np.array(im).astype(np.float32);red,green,blue=[a[:,:,i] for i in range(3)]
 excess=green-np.maximum(red,blue);mask=np.clip((44-excess)/27,0,1)
 strong_green=(green>red*1.28)&(green>blue*1.35)&(excess>28);mask[strong_green]=0
 # Despill only semi-transparent edge pixels; do not recolor the photographed subject.
 edge=(mask>0)&(mask<.999);a[:,:,1][edge]=np.minimum(a[:,:,1][edge],(a[:,:,0][edge]+a[:,:,2][edge])*.5+10)
 alpha=Image.fromarray(np.uint8(mask*255)).filter(ImageFilter.GaussianBlur(.25));rgba=Image.fromarray(np.uint8(np.clip(a,0,255))).convert('RGBA');rgba.putalpha(alpha)
 box=alpha.getbbox();pad=8;box=(max(0,box[0]-pad),max(0,box[1]-pad),min(im.width,box[2]+pad),min(im.height,box[3]+pad));rgba=rgba.crop(box)
 full=D/f'{key}.webp';rgba.save(full,quality=95,method=6)
 manifest['assets'][key]={'source':str(src.relative_to(R)),'cutout':str(full.relative_to(R)),'size':list(rgba.size),'source_crop':box,'layers':[]}
 # Splits retain a full backing with nearest-colour infill only behind the replaced region.
 regions=[]
 if key=='founder':regions=[('head',[(.23,.0),(.72,.0),(.72,.31),(.49,.37),(.24,.32)],235),('scroll',[(.24,.61),(.58,.61),(.65,.78),(.49,.83),(.25,.70)],255)]
 if key=='poet':regions=[('head',[(.25,0),(.75,0),(.76,.35),(.54,.41),(.25,.33)],225),('writing-hand',[(.31,.44),(.69,.54),(.67,.67),(.38,.66),(.28,.55)],250),('manuscript',[(.46,.59),(.99,.57),(.99,.83),(.75,.91),(.47,.84)],242)]
 if key=='hands':regions=[('left-hand',[(0,0),(.34,0),(.38,.64),(.20,.88),(.06,.71)],260),('right-hand',[(.73,0),(1,0),(1,.89),(.78,.91),(.68,.56)],265)]
 if regions:
  masks=[];ra=np.array(rgba);w,h=rgba.size
  for name,poly,z in regions:
   m=Image.new('L',(w,h));ImageDraw.Draw(m).polygon([(int(x*w),int(y*h)) for x,y in poly],fill=255);m=m.filter(ImageFilter.GaussianBlur(.65));ma=np.asarray(m).astype(float)/255;final=np.minimum(np.asarray(rgba.getchannel('A')),np.uint8(ma*255))
   cut=rgba.copy();cut.putalpha(Image.fromarray(final));bb=cut.getbbox();part=cut.crop(bb);fn=D/f'{key}-{name}.webp';part.save(fn,quality=95,method=6)
   manifest['assets'][key]['layers'].append({'key':f'{key}-{name}','path':str(fn.relative_to(R)),'bounds':[bb[0]/w,bb[1]/h,(bb[2]-bb[0])/w,(bb[3]-bb[1])/h],'depth':z});masks.append((ma>.02)&(ra[:,:,3]>0))
  combined=np.logical_or.reduce(masks);expanded=ndimage.binary_dilation(combined,iterations=5)&(ra[:,:,3]>0)
  valid=(ra[:,:,3]>200)&(~expanded)
  nearest=ndimage.distance_transform_edt(~valid,return_distances=False,return_indices=True);fill=ra[tuple(nearest)].copy();filled=ra.copy();filled[expanded,:3]=fill[expanded,:3]
  # The body retains its original outer silhouette, so no neck or wrist holes can be exposed by subpixel parallax.
  body=Image.fromarray(filled);fn=D/f'{key}-body.webp';body.save(fn,quality=95,method=6);manifest['assets'][key]['body']=str(fn.relative_to(R))
 else:manifest['assets'][key]['body']=str(full.relative_to(R))
(R/'research/v5-cutout-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
# Human/agent inspection of clean mattes against the actual palette, not green.
canvas=Image.new('RGB',(1600,1000),'#20251e');xys=[(0,0,800,600),(800,0,800,600),(0,600,800,400),(800,600,800,400)]
for (key,rec),(x,y,w,h) in zip(manifest['assets'].items(),xys):
 im=Image.open(R/rec['cutout']).convert('RGBA');im.thumbnail((w-40,h-30));canvas.paste(im,(x+(w-im.width)//2,y+(h-im.height)//2),im)
canvas.save(R/'research/v5-cutout-review.jpg',quality=92,optimize=True)
print('Four clean subjects and their independent detail mattes prepared. No source image deleted.')
