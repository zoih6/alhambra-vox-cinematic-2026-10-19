/* v5 independent-layer compositor. Injected into the approved layout engine's closure.
   Parents carry layout transforms only. Typography, masks, paper, images, shadows and paths
   each have their own clocks. Native Arabic shaping is rasterized before any matte is applied. */
const V5={queue:[],layers:[],frame:null,inner:null,textCache:new Map(),serial:0};
const LCFG=window.LAYERED_V5;
function bezierEase(x,a=.22,b=.0,c=.18,d=1){x=clamp(x);let u=x;for(let i=0;i<5;i++){const q=1-u,xx=3*q*q*u*a+3*q*u*u*c+u*u*u,dx=3*q*q*a+6*q*u*(c-a)+3*u*u*(1-c);if(Math.abs(dx)<.0001)break;u=clamp(u-(xx-x)/dx);}const q=1-u;return 3*q*q*u*b+3*q*u*u*d+u*u*u;}
function phase(t,start,duration,curve='out'){const x=clamp((t-start)/Math.max(.001,duration));return curve==='inout'?bezierEase(x,.42,0,.58,1):curve==='ink'?bezierEase(x,.32,.01,.2,1):bezierEase(x,.18,0,.2,1);}
function keyValue(t,keys){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<keys[i][0])return lerp(keys[i-1][1],keys[i][1],phase(t,keys[i-1][0],keys[i][0]-keys[i-1][0],keys[i][2]||'inout'));return keys.at(-1)[1];}
function role(name){return V5.frame?.plan?.roles?.[name]||{};}
function layer(name,z,start,duration,properties,draw){const age=V5.frame?.age||0;V5.layers.push({name,depth:z,start,duration,properties,age,visible:age>=start});V5.queue.push({z,order:V5.serial++,draw});}
function flushLayers(g){V5.queue.sort((a,b)=>a.z-b.z||a.order-b.order);for(const l of V5.queue){g.save();l.draw(g);g.restore();}V5.queue.length=0;}
function withPlane(g,z,cam,fn){g.save();cameraLayer(g,z,cam);fn(g);g.restore();}
function maskShape(g,w,h,p,mode='angled',seed=5){
 if(p>=.999)return;if(p<=0){g.beginPath();g.rect(0,0,0,0);g.clip();return;}
 g.beginPath();
 if(mode==='radial'){g.ellipse(0,0,Math.hypot(w,h)*p*.57,Math.hypot(w,h)*p*.57,0,0,Math.PI*2);}
 else if(mode==='up'){const yy=h/2-h*p;g.moveTo(-w/2-5,h/2+5);g.lineTo(w/2+5,h/2+5);g.lineTo(w/2+5,yy);for(let i=0;i<=16;i++){let x=w/2-w*i/16;g.lineTo(x,yy+Math.sin(i*1.7+seed)*3.5);}g.lineTo(-w/2-5,h/2+5);}
 else if(mode==='down'){const yy=-h/2+h*p;g.moveTo(-w/2-5,-h/2-5);g.lineTo(w/2+5,-h/2-5);for(let i=0;i<=16;i++){let x=w/2-w*i/16;g.lineTo(x,yy+Math.sin(i*1.7+seed)*3.5);}g.lineTo(-w/2-5,-h/2-5);}
 else{const edge=w/2-w*p;g.moveTo(w/2+8,-h/2-8);g.lineTo(edge-h*.08,-h/2-8);g.bezierCurveTo(edge+h*.08,-h*.15,edge-h*.06,h*.2,edge+h*.06,h/2+8);g.lineTo(w/2+8,h/2+8);}
 g.closePath();g.clip();
}
function nativeType(str,size,weight=650,family='Alexandria',maxWidth=null){
 const measure=document.createElement('canvas').getContext('2d');ctxFont(measure,size,weight,family);while(maxWidth&&size>18&&measure.measureText(str).width>maxWidth){size--;ctxFont(measure,size,weight,family);}
 const key=[str,size,weight,family].join('|');if(V5.textCache.has(key))return V5.textCache.get(key);
 const m=measure.measureText(str),pad=28,Wt=Math.ceil(m.width+pad*2+4),ascent=Math.ceil(Math.max(size*.9,m.actualBoundingBoxAscent||0)),descent=Math.ceil(Math.max(size*.36,m.actualBoundingBoxDescent||0)),Ht=ascent+descent+pad*2;
 const raw=document.createElement('canvas');raw.width=Wt;raw.height=Ht;const c=raw.getContext('2d',{willReadFrequently:true});ctxFont(c,size,weight,family);c.fillStyle='#fff';c.textAlign='right';const baseline=pad+ascent;c.fillText(str,Wt-pad,baseline);
 const img=c.getImageData(0,0,Wt,Ht),d=img.data,N=Wt*Ht,seen=new Uint8Array(N),queue=new Int32Array(N),dots=[];const isNumber=/^[٠-٩0-9٫.,\s]+$/.test(str);
 // Connected components isolate only small disconnected marks. Joined letter bodies never move apart.
 if(!isNumber){
  for(let j=0;j<N;j++){
   if(seen[j]||d[j*4+3]<12)continue;let front=0,back=1;queue[0]=j;seen[j]=1;let minX=Wt,maxX=0,minY=Ht,maxY=0;
   while(front<back){const q=queue[front++],x=q%Wt,y=(q/Wt)|0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    for(const n of [q-1,q+1,q-Wt,q+Wt]){if(n<0||n>=N||seen[n]||d[n*4+3]<12)continue;if(Math.abs(n%Wt-x)>1)continue;seen[n]=1;queue[back++]=n;}}
   if(back<size*size*.027&&(maxX-minX)<size*.27&&(maxY-minY)<size*.27){
    const box=[Math.max(0,minX-2),Math.max(0,minY-2),Math.min(Wt,maxX+3),Math.min(Ht,maxY+3)],dot=document.createElement('canvas');dot.width=box[2]-box[0];dot.height=box[3]-box[1];const dc=dot.getContext('2d');dc.drawImage(raw,box[0],box[1],dot.width,dot.height,0,0,dot.width,dot.height);
    dots.push({canvas:dot,x:box[0],y:box[1],w:dot.width,h:dot.height});
    for(let k=0;k<back;k++){const p=queue[k],xx=p%Wt,yy=(p/Wt)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const ix=xx+dx,iy=yy+dy;if(ix>=0&&ix<Wt&&iy>=0&&iy<Ht)d[(iy*Wt+ix)*4+3]=0;}}
   }
  }
 }
 const body=document.createElement('canvas');body.width=Wt;body.height=Ht;body.getContext('2d').putImageData(img,0,0);dots.sort((a,b)=>b.x-a.x);
 const rec={key,raw,body,dots,size,baseline,pad,width:Wt,height:Ht,advance:m.width,isNumber,numberParts:[...str].filter(x=>x.trim()).length,tints:new Map()};V5.textCache.set(key,rec);return rec;
}
function tinted(im,color,cache,key){if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);cache.set(key,c);return c;}
function drawTypeMatte(g,str,x,y,size,color,age,duration=.95,opt={}){
 if(age<0)return;const r=nativeType(str,size,opt.weight??650,opt.family||'Alexandria',opt.maxWidth);const align=opt.align||'right';const left=align==='center'?x-r.width/2:align==='left'?x-r.pad:x-r.width+r.pad,top=y-r.baseline;
 const body=tinted(r.body,color,r.tints,'b:'+color);g.save();g.translate(left,top);
 if(r.isNumber){
  const n=Math.max(1,r.numberParts),sw=(r.width-r.pad*2)/n;
  for(let i=0;i<n;i++){const p=phase(age,i*.10,Math.max(.3,duration-.1*n),'ink');g.save();g.beginPath();g.rect(r.pad+i*sw-2,0,sw+4,r.height);g.clip();g.beginPath();g.rect(r.pad+i*sw-3,r.height*(1-p),sw+6,r.height*p);g.clip();g.drawImage(body,0,0);g.restore();}
 }else{
  // Three separate custom matte channels: baseline/body, ascenders, descenders.
  const bands=[[0,r.baseline-r.size*.47,.11],[r.baseline-r.size*.47,r.baseline+r.size*.07,0],[r.baseline+r.size*.07,r.height,.20]];
  for(const [y0,y1,delay] of bands){let p=phase(age,delay,duration,'ink');if(p<=0)continue;g.save();g.beginPath();g.rect(0,y0-2,r.width,y1-y0+4);g.clip();if(p<.999){const edge=r.width*(1-p);g.beginPath();g.moveTo(r.width+4,y0-4);g.lineTo(edge-8,y0-4);g.bezierCurveTo(edge+12,y0+(y1-y0)*.3,edge-14,y0+(y1-y0)*.7,edge+4,y1+4);g.lineTo(r.width+4,y1+4);g.closePath();g.clip();}g.drawImage(body,0,0);g.restore();}
  for(let i=0;i<r.dots.length;i++){const d=r.dots[i],p=phase(age,.20+i*.026,Math.max(.20,duration*.44),'ink');if(p<=0)continue;g.save();g.beginPath();g.arc(d.x+d.w/2,d.y+d.h/2,Math.hypot(d.w,d.h)*.55*p,0,Math.PI*2);g.clip();g.drawImage(tinted(d.canvas,color,r.tints,'d:'+i+':'+color),d.x,d.y);g.restore();}
 }
 g.restore();
}
function arabic(g,str,x,y,size=80,color=P.ivory,opt={}){
 const inner=V5.inner;const age=inner?inner.age-.18-(inner.textIndex++)*.12:3;
 drawTypeMatte(g,str,x,y,size,color,age,.7,opt);
}
function object(g,cam,z,x,y,t,start,fn,opt={}){
 const age=t-start;const id='parent/'+V5.frame.scene.id+'/'+V5.serial;
 layer(id,z,start,0,['parent layout transform only'],c=>{if(age<0)return;withPlane(c,z,cam,q=>{q.translate(x,y);q.rotate(opt.rotation||0);const saved=V5.inner;V5.inner={age,textIndex:0,paperIndex:0,strokeIndex:0};fn(q,age);V5.inner=saved;});});
}
function label(g,cam,str,x,y,size,t,start=0,opt={}){
 const z=opt.z??495;let duration=opt.duration??1.04;const age=t-start;
 layer('type/'+str+'/body',z,start,duration,['native Arabic alpha body matte','ascender mask','descender mask'],c=>{if(age<0)return;withPlane(c,z,cam,q=>drawTypeMatte(q,str,x,y,size,opt.color||P.ivory,age,duration,{family:opt.family||'Alexandria',weight:opt.weight??650,maxWidth:opt.maxWidth??700,align:opt.align||'right'}));});
 V5.layers.push({name:'type/'+str+'/dots',depth:z,start:start+.20,duration:duration*.6,properties:['right-to-left mark apertures; positions unchanged']});
}
function paperRaster(w,h,color,seed){return getSurface('v5-paper-'+[w,h,color,seed].join('-'),w+70,h+70,(g,cw,ch)=>{g.translate(cw/2,ch/2);pathTorn(g,w,h,seed);g.clip();g.drawImage(A[color==='ink'?'charcoal':color==='red'?'red':'paper'],-w/2,-h/2,w,h);});}
function paperShadow(g,x,y,w,h,rot,age,seed=9){if(age<0)return;const p=phase(age,0,1.2);const sh=getSurface('v5-shadow-'+[w,h,seed].join('-'),w+130,h+130,(c,cw,ch)=>{c.translate(cw/2,ch/2);c.shadowColor='rgba(0,0,0,.62)';c.shadowBlur=28;c.shadowOffsetY=12;c.fillStyle='#000';pathTorn(c,w,h,seed);c.fill();});g.save();g.translate(x+lerp(-13,-6,p),y+lerp(26,12,p));g.rotate(rot);g.globalAlpha=.24*phase(age,.03,.7);g.drawImage(sh,-sh.width/2,-sh.height/2);g.restore();}
function paper(g,x,y,w,h,color='paper',rot=0,seed=10){
 const age=V5.inner?V5.inner.age-(V5.inner.paperIndex++)*.13:3;
 paperShadow(g,x,y,w,h,rot,age,seed);if(age<.08)return;const image=paperRaster(w,h,color,seed);const p=phase(age,.08,.68,'ink');g.save();g.translate(x,y);g.rotate(rot);maskShape(g,image.width,image.height,p,'angled',seed);g.drawImage(image,-image.width/2,-image.height/2);g.restore();
 V5.layers.push({name:'paper/'+seed+'/shadow',depth:V5.frame?.plan?.roles?.paper_shadow?.depth??35,start:0,duration:1.2,properties:['independent offset and density']});
}
function tag(g,cam,str,x,y,t,start=0,w=420,color='ink',size=43){
 const age=t-start;layer('tag/'+str+'/shadow',123,start,1.2,['shadow offset/density'],c=>withPlane(c,123,cam,q=>paperShadow(q,x,y,w,90,-.025,age,38)));
 layer('tag/'+str+'/backing',130,start+.05,.55,['torn-edge matte'],c=>{if(age<.05)return;withPlane(c,130,cam,q=>{q.translate(x,y);q.rotate(-.025);const im=paperRaster(w,90,color,38);maskShape(q,im.width,im.height,phase(age,.05,.55),'angled');q.drawImage(im,-im.width/2,-im.height/2);});});
 layer('tag/'+str+'/ink',132,start+.19,.76,['separate Arabic matte; parent-linked to backing'],c=>{if(age<.19)return;withPlane(c,132,cam,q=>{q.translate(x,y);q.rotate(-.025);drawTypeMatte(q,str,0,17,size,color==='paper'?P.ink:P.ivory,age-.19,.76,{align:'center',maxWidth:w-35});});});
}
function trace(g,pts,p=1,col=P.redLight,width=6){
 if(V5.inner){p=Math.min(p,phase(V5.inner.age,.32+(V5.inner.strokeIndex++)*.035,.8,'ink'));}
 if(p<=0)return;let lengths=[],total=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lengths.push(d);total+=d;}let remain=clamp(p)*total;
 g.save();g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++){let d=lengths[i-1];if(remain>=d){g.lineTo(...pts[i]);remain-=d;}else{g.lineTo(lerp(pts[i-1][0],pts[i][0],remain/d),lerp(pts[i-1][1],pts[i][1],remain/d));break;}}g.strokeStyle=col;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();g.restore();
}
function arch(g,x,y,w,h,col=P.paper,th=3){const pts=[];pts.push([x-w/2,y+h/2],[x-w/2,y]);for(let i=0;i<=40;i++){const a=Math.PI-i*Math.PI/40;pts.push([x+Math.cos(a)*w*.5,y-Math.sin(a)*h*.55]);}pts.push([x+w/2,y+h/2]);trace(g,pts,1,col,th);}
function imageLayer(g,im,key,x,y,w,h,z,cam,rot=0,alpha=1,focus=true){
 layer('image/'+key,z,0,0,['depth parallax','focus plane'],c=>{c.save();cameraLayer(c,z,cam);c.translate(x,y);c.rotate(rot);c.globalAlpha=alpha;const blur=focus?clamp(Math.abs(z-cam.focus)*.006,0,5):0;const q=getBlur(im,key,blur);c.drawImage(q.a,-w/2,-h/2,w,h);if(q.mix>0){c.globalAlpha=alpha*q.mix;c.drawImage(q.b,-w/2,-h/2,w,h);}c.restore();});
}
function photoNode(g,cam,key,x,y,w,h,t,start=0,rot=-.035,z=90){
 const age=t-start,mode=V5.frame.plan.photo_mask||'angled-paper-reveal';
 layer('photo/'+key+'/shadow',z-14,start,1.25,['separate penumbra and optical offset'],c=>withPlane(c,z-14,cam,q=>paperShadow(q,x,y,w+15,h+15,rot,age,31)));
 layer('photo/'+key+'/mount',z-7,start+.04,.68,['mount-only torn-edge matte'],c=>{if(age<.04)return;withPlane(c,z-7,cam,q=>{q.translate(x,y);q.rotate(rot);const im=paperRaster(w+15,h+15,'paper',31);maskShape(q,im.width,im.height,phase(age,.04,.68),'angled');q.drawImage(im,-im.width/2,-im.height/2);});});
 const photo=getSurface('v5-photo-'+[key,w,h].join('-'),w,h,(c)=>{c.filter='saturate(.72) contrast(1.04)';imageCover(c,A[key],0,0,w,h,.55);});
 const paint=(name,st,dur,zone,mask)=>layer('photo/'+key+'/'+name,z,start+st,dur,['independent image track matte',mask],c=>{if(age<st)return;withPlane(c,z,cam,q=>{q.translate(x,y);q.rotate(rot);pathTorn(q,w,h,31,5);q.clip();if(zone){q.beginPath();q.rect(-w/2,-h/2+h*zone[0],w,h*(zone[1]-zone[0]));q.clip();}maskShape(q,w,h,phase(age,st,dur,'ink'),mask);q.drawImage(photo,-w/2,-h/2);});});
 if(mode==='facade-then-water-reflection'){paint('facade',.30,1.05,[0,.68],'down');paint('reflection',2.7,1.25,[.68,1],'up');}
 else if(mode==='radial-ceiling'||mode==='center-out-radial'||mode==='aperture-lens')paint('aperture',.30,1.1,null,'radial');
 else if(mode==='horizon-rise')paint('horizon',.28,1.15,null,'up');
 else paint('image',.30,1.02,null,'angled');
}
function cutNode(g,cam,key,x,y,w,t,start=0,z=180,rot=0){
 const age=t-start,im=A[key],h=w/im.width*im.height;
 layer('cutout/'+key+'/shadow',z-12,start,1.25,['independent silhouette shadow'],c=>{if(age<0)return;withPlane(c,z-12,cam,q=>{q.translate(x+keyValue(age,[[0,-15],[.8,-7],[1.3,-4]]),y+keyValue(age,[[0,29],[.65,18],[1.3,10]]));q.rotate(rot);q.globalAlpha=.20*phase(age,.05,.8);q.filter='blur(12px)';const sh=getSurface('cutshadow-'+key,im.width,im.height,(a)=>{a.drawImage(im,0,0);a.globalCompositeOperation='source-in';a.fillStyle='#000';a.fillRect(0,0,im.width,im.height);});q.drawImage(sh,-w/2,-h/2,w,h);});});
 layer('cutout/'+key+'/silhouette',z,start+.12,1.05,['contour matte; no group entrance transform'],c=>{if(age<.12)return;withPlane(c,z,cam,q=>{q.translate(x,y);q.rotate(rot);maskShape(q,w,h,phase(age,.12,1.05),'up');q.drawImage(im,-w/2,-h/2,w,h);});});
}
function titleBlock(g,cam,s,t,opt={}){
 const x=opt.x??1760,y=opt.y??350,col=opt.color||P.ivory,pl=V5.frame.plan.roles;
 if(s.eyebrow)label(g,cam,s.eyebrow,x,y-166,55,t,pl.eyebrow?.start??.12,{color:col,maxWidth:800,duration:.68});
 label(g,cam,s.title,x,y,opt.size??140,t,pl.title_body?.start??.32,{family:opt.family||'Amiri',weight:400,color:col,maxWidth:opt.width??820,duration:1.08});
 if(s.subtitle)tag(g,cam,s.subtitle,x-(opt.tagWidth??640)/2,y+130,t,pl.subtitle_mount?.start??.85,opt.tagWidth??640,opt.tagColor||'ink',opt.subSize??48);
 if(s.detail)label(g,cam,s.detail,x,y+266,43,t,pl.detail?.start??3.2,{color:col,maxWidth:760,duration:.82});
}
function redThread(g,cam,t,variant=0){layer('red-thread/path-and-tip',450,.72,1.75,['arc-length Trim Paths','round cap follows endpoint'],c=>withPlane(c,40,cam,q=>trace(q,curve([180,905-variant*20],[720,1050],[1060,660+variant*35],[1760,780]),phase(t,.72,1.75,'ink'),P.redLight,6)));}
function stage(g,cam,s,t){
 const type=s.type,name=(type==='chorus'||type==='credits-v5'||waterTypes.has(type))?'water':'stone',m=window.CINEMATIC_DEPTH.layers[name],tw=2160,th=tw*m.size[1]/m.size[0];
 imageLayer(g,A[name+'-backing'],name+'-backing',960,540,tw,th,-580,cam,0,1,true);
 for(const p of m.overlays){if(p.key==='stone-hero'&&s.type!=='stone')continue;const b=p.bounds_normalized;const x=960+(b[0]+b[2]/2-.5)*tw,y=540+(b[1]+b[3]/2-.5)*th;const a=p.key==='stone-palace'&&!['stone','hero','home','closing','resistance','sigh','return'].includes(type)?.43:1;imageLayer(g,A[p.key],p.key,x,y,tw*b[2],th*b[3],p.depth,cam,0,a,true);}
 layer('scene/light-flag',430,0,0,['static type-protecting flag'],c=>{const side=c.createLinearGradient(850,0,1920,0);side.addColorStop(0,'rgba(12,17,14,0)');side.addColorStop(1,'rgba(12,17,14,.58)');c.fillStyle=side;c.fillRect(650,0,1270,1080);});
}
