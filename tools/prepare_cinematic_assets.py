"""Create reusable depth mattes for two authored plates; keeps all originals."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageOps,ImageEnhance
import numpy as np,json
from scipy import ndimage
R=Path(__file__).resolve().parents[1];D=R/'assets/cinematic';D.mkdir(exist_ok=True)
manifest={'generated_plates_are_conceptual_illustrations':True,'layers':{}}
def split(name,regions):
 im=Image.open(R/f'assets/generated/cinematic-plate-{name}.jpg').convert('RGB');w,h=im.size;a=np.array(im)
 masks=[];defs=[]
 for key,poly,depth in regions:
  mask=Image.new('L',(w,h));draw=ImageDraw.Draw(mask)
  draw.polygon([(round(x*w),round(y*h)) for x,y in poly],fill=255)
  # Soft half-pixel matte; geometry stays fixed for every video frame.
  mask=mask.filter(ImageFilter.GaussianBlur(.65));box=mask.getbbox()
  rgba=Image.merge('RGBA',(*im.split(),mask)).crop(box)
  path=D/f'{name}-{key}.webp';rgba.save(path,quality=95,method=6)
  defs.append({'key':f'{name}-{key}','path':str(path.relative_to(R)),'bounds_normalized':[box[0]/w,box[1]/h,(box[2]-box[0])/w,(box[3]-box[1])/h],'depth':depth})
  masks.append(np.asarray(mask)>4)
 combined=np.logical_or.reduce(masks)
 expanded=ndimage.binary_dilation(combined,iterations=9)
 # Nearest surrounding substrate fills only the hidden backing. The original subject is composited on top.
 nearest=ndimage.distance_transform_edt(expanded,return_distances=False,return_indices=True)
 filled=a[tuple(nearest)];fill=Image.fromarray(filled).filter(ImageFilter.GaussianBlur(9))
 backing=Image.composite(fill,im,Image.fromarray(expanded.astype(np.uint8)*255))
 backing.save(D/f'{name}-backing.jpg',quality=94,optimize=True)
 manifest['layers'][name]={'original':f'assets/generated/cinematic-plate-{name}.jpg','backing':f'assets/cinematic/{name}-backing.jpg','size':[w,h],'overlays':defs}
# The matte edges follow the generated physical object, not arbitrary rectangular tiles.
split('stone',[
 ('palace',[(.36,.39),(.40,.385),(.435,.34),(.462,.395),(.51,.415),(.58,.415),(.62,.46),(.66,.39),(.7,.38),(.76,.41),(.82,.39),(.87,.35),(.90,.37),(.9,.53),(1,.50),(1,.68),(.35,.68)],-110),
 ('hero',[(.082,.39),(.114,.382),(.201,.383),(.261,.368),(.29,.374),(.319,.389),(.362,.394),(.369,.46),(.367,.765),(.341,.79),(.151,.786),(.108,.711),(.09,.665),(.08,.583)],230),
 ('foreground',[(0,.776),(.08,.804),(.20,.873),(.35,.939),(.55,.93),(.73,.866),(.89,.835),(1,.756),(1,1),(0,1)],440)
])
split('water',[
 ('wall',[(.14,.267),(.999,.179),(1,.721),(.86,.72),(.70,.68),(.59,.70),(.40,.704),(.28,.726),(.13,.746)],-70),
 ('arch',[(0,0),(.235,0),(.196,.045),(.157,.13),(.142,.235),(.123,.43),(.126,.69),(.122,1),(0,1)],420)
])
# Small lossless/near-lossless reusable location textures; originals remain intact.
for key,name in [('myrtles','myrtles-court'),('dome','muqarnas-dome'),('lions','lions-court')]:
 p=R/f'assets/photos/{name}.jpg'
 if p.exists():
  im=Image.open(p).convert('RGB');im.thumbnail((1920,1400));im.save(D/f'{key}.webp',quality=94,method=6)
(R/'research/cinematic-depth-assets.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Two cinematic plates split into deterministic depth layers. Originals retained.')
