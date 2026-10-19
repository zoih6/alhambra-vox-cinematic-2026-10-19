/* Alhambra Cinematic Engine v2 — authored 2.5D stage, continuous camera, 32fps.
   All pixels are a deterministic function of absolute time and immutable assets.
   Internal paper/object transforms are sampled at 8fps; camera, light, focus and dust are continuous.
   No renderer timers, frame history, CSS transitions, or non-seeded randomness. */
(() => {
'use strict';
const W=1920,H=1080,FPS=32,REF_DOLLY=80,F=1700;
const P={ink:'#1b211d',paper:'#e8dec6',ivory:'#f5eddc',red:'#b24932',redLight:'#d56645',blue:'#617d7d',gold:'#bca876'};
const A={}, BLUR=new Map(), SURF=new Map();
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const lerp=(a,b,x)=>a+(b-a)*x;
function spring(t,k=150,d=23){if(t<=0)return 0;const q=d*d-4*k;if(Math.abs(q)<1e-6){const w=Math.sqrt(k);return 1-Math.exp(-w*t)*(1+w*t);}if(q<0){const w=Math.sqrt(k-d*d/4);return 1-Math.exp(-d*t/2)*(Math.cos(w*t)+d/(2*w)*Math.sin(w*t));}const a=(-d+Math.sqrt(q))/2,b=(-d-Math.sqrt(q))/2;return 1-(b*Math.exp(a*t)-a*Math.exp(b*t))/(b-a);}
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const qtime=t=>Math.floor(Math.max(0,t)*8)/8;
const scenes=window.CINEMATIC_CONFIG.scenes;
const audioEnvelope=window.CINEMATIC_ENVELOPE||[];
let sceneCacheId='';
function sceneAt(t){return scenes.find(s=>t>=s.from&&t<s.to)||scenes[scenes.length-1];}
function focusAt(t){let i=scenes.findIndex(s=>t>=s.from&&t<s.to);if(i<0)i=scenes.length-1;const s=scenes[i],prev=scenes[Math.max(0,i-1)];return lerp(prev.focus,s.focus,smooth((t-s.from)/1.35));}
function camera(t){if(window.MUSIC_SECTION!=='resume')return musicCamera(t);return{x:32*Math.sin(t*.087-.3)+13*Math.sin(t*.021),y:14*Math.sin(t*.055)+5*Math.cos(t*.12),dolly:80+40*Math.sin(t*.058-.8),roll:.0018*Math.sin(t*.038),focus:focusAt(t)};}
function cameraLayer(g,z,cam){const p=F/(F-z-cam.dolly),p0=F/(F-z-REF_DOLLY),sc=p/p0;g.translate(W/2-cam.x*p,H/2-cam.y*p);g.rotate(cam.roll);g.scale(sc,sc);g.translate(-W/2,-H/2);}
function ctxFont(g,size,weight=650,family='Alexandria'){g.font=`${weight} ${size}px "${family}"`;g.direction='rtl';g.textBaseline='alphabetic';}
function arabic(g,str,x,y,size=80,color=P.ivory,opt={}){g.save();ctxFont(g,size,opt.weight??650,opt.family??'Alexandria');if(opt.maxWidth){while(size>18&&g.measureText(str).width>opt.maxWidth){size-=1;ctxFont(g,size,opt.weight??650,opt.family??'Alexandria');}}g.fillStyle=color;g.textAlign=opt.align||'right';if(color===P.ivory||color===P.paper){g.shadowColor='rgba(9,14,10,.48)';g.shadowBlur=4;g.shadowOffsetY=2;}g.fillText(str,x,y);g.restore();}
function latin(g,str,x,y,size=30,color=P.ivory){g.save();g.direction='ltr';g.font=`500 ${size}px "Alexandria",sans-serif`;g.fillStyle=color;g.textAlign='center';g.fillText(str,x,y);g.restore();}
function pathTorn(g,w,h,seed=12,rough=6){const r=rng(seed);g.beginPath();g.moveTo(-w/2,-h/2);for(let i=1,n=Math.ceil(w/35);i<=n;i++)g.lineTo(-w/2+w*i/n,-h/2+(r()-.5)*rough*2);for(let i=1,n=Math.ceil(h/35);i<=n;i++)g.lineTo(w/2+(r()-.5)*rough*2,-h/2+h*i/n);for(let i=1,n=Math.ceil(w/35);i<=n;i++)g.lineTo(w/2-w*i/n,h/2+(r()-.5)*rough*2);for(let i=1,n=Math.ceil(h/35);i<=n;i++)g.lineTo(-w/2+(r()-.5)*rough*2,h/2-h*i/n);g.closePath();}
function paper(g,x,y,w,h,color='paper',rot=0,seed=10){
 const image=getSurface(`paper-${w}-${h}-${color}-${seed}`,w+90,h+90,(c,cw,ch)=>{c.translate(cw/2,ch/2);pathTorn(c,w,h,seed);c.shadowColor='rgba(0,0,0,.4)';c.shadowBlur=22;c.shadowOffsetY=16;c.fillStyle=color==='red'?P.red:color==='ink'?P.ink:P.paper;c.fill();c.shadowColor='transparent';c.clip();const img=A[color==='ink'?'charcoal':color==='red'?'red':'paper'];if(img)c.drawImage(img,-w/2,-h/2,w,h);});
 g.save();g.translate(x,y);g.rotate(rot);g.drawImage(image,-image.width/2,-image.height/2);g.restore();
}
function trace(g,pts,p=1,col=P.redLight,width=6){if(p<=0)return;let lens=[],total=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lens.push(d);total+=d;}let rem=clamp(p)*total;g.save();g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++){const d=lens[i-1];if(rem>=d){g.lineTo(...pts[i]);rem-=d;}else{g.lineTo(lerp(pts[i-1][0],pts[i][0],rem/d),lerp(pts[i-1][1],pts[i][1],rem/d));break;}}g.lineCap='round';g.lineJoin='round';g.strokeStyle=col;g.lineWidth=width;g.stroke();g.restore();}
function curve(a,b,c,d,n=80){const q=[];for(let i=0;i<=n;i++){let t=i/n,u=1-t;q.push([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]]);}return q;}
function disc(g,x,y,r,c){g.beginPath();g.arc(x,y,Math.max(.01,r),0,Math.PI*2);g.fillStyle=c;g.fill();}
function star(g,x,y,r,c,rotation=0){g.save();g.translate(x,y);g.rotate(rotation);g.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8,rr=i%2?r*.69:r;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fillStyle=c;g.fill();g.restore();}
function arch(g,x,y,w,h,col=P.paper,th=3){g.save();g.translate(x,y);g.strokeStyle=col;g.lineWidth=th;g.beginPath();g.moveTo(-w/2,h/2);g.lineTo(-w/2,0);g.bezierCurveTo(-w*.64,-h*.27,-w*.3,-h*.54,0,-h*.55);g.bezierCurveTo(w*.3,-h*.54,w*.64,-h*.27,w/2,0);g.lineTo(w/2,h/2);g.stroke();g.restore();}
function imageCover(g,im,x,y,w,h,fy=.5){const k=Math.max(w/im.width,h/im.height),sw=w/k,sh=h/k;g.drawImage(im,(im.width-sw)/2,(im.height-sh)*fy,sw,sh,x,y,w,h);}
function getSurface(key,w,h,fn){if(SURF.has(key))return SURF.get(key);const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);fn(c.getContext('2d'),c.width,c.height);SURF.set(key,c);return c;}
function photoSurface(key,w,h){return getSurface(`photo-${key}-${w}-${h}`,w+100,h+100,(g,cw,ch)=>{g.translate(cw/2,ch/2);pathTorn(g,w+15,h+15,31,5);g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=26;g.shadowOffsetY=16;g.fillStyle=P.paper;g.fill();g.shadowColor='transparent';pathTorn(g,w,h,31,5);g.clip();g.filter='saturate(.72) contrast(1.04)';imageCover(g,A[key],-w/2,-h/2,w,h,.55);});}
function getBlur(im,key,radius){const n=[0,1.5,3.5,6.5],b=clamp(radius,0,6.5);let hi=n.findIndex(x=>x>=b);if(hi<0)hi=3;let lo=Math.max(0,hi-1);if(b===0)lo=hi=0;const res=[];for(const k of new Set([lo,hi])){const id=key+'#'+n[k];if(!BLUR.has(id)){if(n[k]===0)BLUR.set(id,im);else{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.filter=`blur(${n[k]}px)`;g.drawImage(im,0,0);BLUR.set(id,c);}}res[k]=BLUR.get(id);}return{a:res[lo],b:res[hi],mix:hi===lo?0:(b-n[lo])/(n[hi]-n[lo])};}
function imageLayer(g,im,key,x,y,w,h,z,cam,rot=0,alpha=1,focus=true){
 g.save();cameraLayer(g,z,cam);g.translate(x,y);g.rotate(rot);g.globalAlpha=alpha;
 const blur=focus?clamp(Math.abs(z-cam.focus)*.007,0,5.8):0;
 const q=getBlur(im,key,blur);g.drawImage(q.a,-w/2,-h/2,w,h);if(q.mix>0){g.globalAlpha=alpha*q.mix;g.drawImage(q.b,-w/2,-h/2,w,h);}g.restore();
}
function object(g,cam,z,x,y,t,start,fn,opt={}){
 const dt=(opt.continuous?t:qtime(t))-start;if(dt<0)return;
 const e=spring(dt,opt.heavy?90:190,opt.heavy?20:25);
 g.save();cameraLayer(g,z,cam);g.translate(x+(opt.dx??30)*(1-e),y+(opt.dy??55)*(1-e));g.rotate((opt.rotation??0)+(opt.tilt??.04)*(1-e));
 g.scale(.97+.03*e,.97+.03*e);g.globalAlpha=clamp(dt/.12);fn(g,dt);g.restore();
}
function label(g,cam,str,x,y,size,t,start=0,opt={}){object(g,cam,opt.z??95,x,y,t,start,(c)=>{arabic(c,str,0,0,size,opt.color||P.ivory,{family:opt.family||'Alexandria',weight:opt.weight??650,maxWidth:opt.maxWidth??700,align:opt.align||'right'});},{dx:opt.dx??20,dy:opt.dy??35,heavy:opt.heavy??true,tilt:0});}
function tag(g,cam,str,x,y,t,start=0,w=420,color='ink',size=43){object(g,cam,130,x,y,t,start,c=>{paper(c,0,0,w,90,color,-.025,38);arabic(c,str,0,17,size,color==='paper'?P.ink:P.ivory,{align:'center',maxWidth:w-35});},{dx:35,dy:20,heavy:false});}
function photoNode(g,cam,key,x,y,w,h,t,start=0,rot=-.035,z=90){const dt=qtime(t)-start;if(dt<0)return;const p=spring(dt,90,20),im=photoSurface(key,w,h);imageLayer(g,im,`photo-${key}-${w}-${h}`,x+35*(1-p),y+95*(1-p),w+100,h+100,z,cam,rot+.06*(1-p),clamp(dt/.12),true);}
function cutNode(g,cam,key,x,y,w,t,start=0,z=180,rot=0){const dt=qtime(t)-start;if(dt<0)return;const p=spring(dt,90,20),im=A[key];imageLayer(g,im,key,x+30*(1-p),y+70*(1-p),w,w/im.width*im.height,z,cam,rot+.035*(1-p),clamp(dt/.14),true);}
function titleBlock(g,cam,s,t,opt={}){
 const x=opt.x??1760,y=opt.y??350,color=opt.color||P.ivory;
 if(s.eyebrow)label(g,cam,s.eyebrow,x,y-166,55,t,.12,{color,maxWidth:800});
 label(g,cam,s.title,x,y,opt.size??140,t,.32,{family:opt.family||'Amiri',weight:400,color,maxWidth:opt.width??820});
 if(s.subtitle)tag(g,cam,s.subtitle,x-(opt.tagWidth??640)/2,y+130,t,.85,opt.tagWidth??640,opt.tagColor||'ink',opt.subSize??48);
 if(s.detail)label(g,cam,s.detail,x,y+266,43,t,Math.min(3.2,(s.to-s.from)*.4),{color,maxWidth:760});
}
const waterTypes=new Set(['muwashah','credits-personal','pool','court','lions','columns','rim','dome','motto','sound','verse','poet','growth','transformation','patrons','credits']);
function stage(g,cam,s,t){
 const name=waterTypes.has(s.type)?'water':'stone',m=window.CINEMATIC_DEPTH.layers[name],tw=2160,th=tw*m.size[1]/m.size[0];
 imageLayer(g,A[name+'-backing'],name+'-backing',960,540,tw,th,-580,cam,0,1,true);
 const showHero=s.type==='stone';
 for(const lay of m.overlays){if(lay.key==='stone-hero'&&!showHero)continue;const b=lay.bounds_normalized,im=A[lay.key],x=960+(b[0]+b[2]/2-.5)*tw,y=540+(b[1]+b[3]/2-.5)*th;
  const alpha=(lay.key==='stone-palace'&&!['stone','hero','home','closing','resistance','sigh','return'].includes(s.type))?.43:1;
  imageLayer(g,im,lay.key,x,y,tw*b[2],th*b[3],lay.depth,cam,0,alpha,true);
 }
 // A physical black flag on the light, rather than a UI glow: protect the type area.
 const side=g.createLinearGradient(850,0,1920,0);side.addColorStop(0,'rgba(12,17,14,0)');side.addColorStop(1,'rgba(12,17,14,.62)');g.fillStyle=side;g.fillRect(650,0,1270,1080);
 g.fillStyle=name==='water'?'rgba(21,23,17,.24)':'rgba(21,23,17,.10)';g.fillRect(0,0,W,H);
}
function redThread(g,cam,t,variant=0){g.save();cameraLayer(g,40,cam);const pts=curve([180,905-variant*20],[720,1050],[1060,660+variant*35],[1760,780]);trace(g,pts,smooth((qtime(t)-.7)/2.1),P.redLight,6);g.restore();}
function mapGraphic(g,t,decline=false){
 paper(g,0,0,1040,735,'paper',-.035,201);g.save();g.rotate(-.035);g.beginPath();g.rect(-490,-335,980,670);g.clip();g.fillStyle='#9aa89f';g.fillRect(-490,-335,980,670);
 const project=p=>[-490+(p[0]+11)/16*980,-335+(45-p[1])/11*670];
 for(let j=0;j<11;j++)trace(g,[[-490,-335+j*67],[490,-335+j*67]],1,'rgba(26,42,38,.1)',1);
 for(const f of window.CINEMATIC_MAP.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys){g.beginPath();for(const ring of poly){ring.forEach((p,i)=>{const a=project(p);if(i)g.lineTo(...a);else g.moveTo(...a);});g.closePath();}g.fillStyle=f.properties.name==='Spain'?'#ddd3b9':f.properties.name==='Portugal'?'#bcbbaa':'#c3bda9';g.fill();g.strokeStyle='#626e61';g.lineWidth=2;g.stroke();}}
 const pt=project([-3.5881,37.1761]);disc(g,...pt,13,P.red);g.beginPath();g.arc(...pt,28,0,Math.PI*2);g.lineWidth=3;g.strokeStyle=P.red;g.stroke();arabic(g,'غرناطة',pt[0]+195,pt[1]-42,45,P.ink);
 if(decline){const cities=[[-4.78,37.89],[-5.99,37.39],[-3.78,37.77],[-4.03,39.86]];cities.forEach((p,i)=>{const a=project(p),v=clamp((t-1-i*.8)/.7);disc(g,...a,11,lerp(0,1,v)>.4?P.red:'#344337');trace(g,[[a[0]-16,a[1]-16],[a[0]+16,a[1]+16]],v,P.red,3);});}
 g.restore();
}
function keyGraphic(g){
 g.save();g.rotate(-.42);g.strokeStyle=P.gold;g.lineWidth=23;g.lineCap='round';g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=20;g.shadowOffsetY=14;
 g.beginPath();g.arc(-190,0,95,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(-92,0);g.lineTo(290,0);g.lineTo(290,75);g.lineTo(220,75);g.lineTo(220,34);g.stroke();g.lineWidth=8;g.strokeStyle='#e7cf93';g.beginPath();g.arc(-190,-4,95,Math.PI,Math.PI*1.8);g.stroke();g.restore();
}
function waveform(g,t,w=1000){const e=audioEnvelope[Math.min(audioEnvelope.length-1,Math.floor(t*32))]||.1;g.save();for(let i=0;i<90;i++){const a=i/89,hh=(11+e*145)*(Math.sin(i*.71+t*.5)**2*.65+.2)*Math.sin(Math.PI*a);g.fillStyle=i%9===0?P.redLight:P.paper;g.fillRect(-w/2+i*w/90,-hh,5,hh*2);}g.restore();}
/* Injected into the deterministic cinematic engine's closure; all motion is time-derived. */
const MU=window.MUWASHAH_DATA;
function musicEnergy(t){const a=MU.energy||[],x=clamp(t*32,0,Math.max(0,a.length-1)),i=Math.floor(x);return lerp(a[i]||0,a[Math.min(i+1,a.length-1)]||0,x-i);}
function musicPulse(t){let p=0;for(const e of MU.onsets||[]){const d=t-e.time;if(d>=0&&d<.55)p+=e.strength*Math.exp(-d*10);}return clamp(p);}
function musicCamera(t){const credit=window.MUSIC_SECTION==='credits';return{x:(credit?15:52)*Math.sin(t*.105-.55)+16*Math.sin(t*.029),y:10*Math.sin(t*.13)+6*Math.cos(t*.07),dolly:credit?102+10*Math.sin(t*.13):108+45*Math.sin(t*.06-.4)+21*Math.sin(t*.16),roll:.0013*Math.sin(t*.13),focus:credit?30:90+42*Math.sin(t*.11)};}
function musicWater(g,cam,t,e){
 g.save();cameraLayer(g,50,cam);g.beginPath();g.moveTo(800,835);g.lineTo(1110,835);g.lineTo(1380,1080);g.lineTo(570,1080);g.closePath();g.clip();
 for(let i=0;i<14;i++){const y=842+i*18;g.strokeStyle=`rgba(242,224,183,${.045+.08*e})`;g.lineWidth=1.3;g.beginPath();for(let k=0;k<=44;k++){const x=565+k*19,yy=y+3.7*Math.sin(k*.31+t*1.5+i*.7)*(1+e*.5);if(k)g.lineTo(x,yy);else g.moveTo(x,yy);}g.stroke();}
 for(const o of MU.onsets||[]){const age=t-o.time;if(age<0||age>1.7||o.strength<.58)continue;g.strokeStyle=`rgba(233,217,175,${.2*(1-age/1.7)*o.strength})`;g.lineWidth=1.5;g.beginPath();g.ellipse(960,935,12+age*150,3+age*34,0,0,Math.PI*2);g.stroke();}
 g.restore();
}
function musicRain(g,cam,t,line,e){
 const active=line.words.find(w=>t>=w.start&&t<w.end+.3&&w.text==='الغيث');if(!active)return;
 const r=rng(2671+line.id);g.save();cameraLayer(g,-80,cam);g.strokeStyle='rgba(243,230,200,.23)';g.lineWidth=1.7;
 for(let i=0;i<29;i++){const x=250+r()*1420,offset=r()*280,y=240+((t-active.start)*185+offset)%610;g.globalAlpha=.15+.6*e;g.beginPath();g.moveTo(x,y);g.lineTo(x-8,y+19+r()*13);g.stroke();}g.restore();
}
function singingThread(g,cam,t,e,pulse){
 g.save();cameraLayer(g,145,cam);const pts=[];for(let i=0;i<=144;i++){const u=i/144,env=Math.sin(Math.PI*u);pts.push([120+1680*u,880+35*Math.sin(u*5.8-t*.29)+env*(13+18*e)*Math.sin(u*19-t*2.1)+pulse*6*Math.sin(u*29)]);}trace(g,pts,smooth((t-.1)/1.5),P.redLight,5);g.restore();
}
const LYRIC_LAYOUTS=new Map();
function wordLine(g,cam,line,t,energy,pulse){
 // Shape complete Arabic words. Connected Arabic letters are never separated or shuffled.
 let layout=LYRIC_LAYOUTS.get(line.id);
 if(!layout){let size=190;const measure=document.createElement('canvas').getContext('2d');let widths,space,total;
 do{ctxFont(measure,size,400,'Amiri');widths=line.words.map(w=>measure.measureText(w.text).width);space=size*.22;total=widths.reduce((a,b)=>a+b,0)+space*(widths.length-1);if(total>1500)size-=2;}while(total>1500&&size>110);
 layout={size,widths,space,total};LYRIC_LAYOUTS.set(line.id,layout);}
 const {size,widths,space,total}=layout;
 const revealT=t-line.start,enter=spring(Math.max(0,t),90,20),dark=line.id===2||line.id===3;
 const cx=960,cy=570+65*(1-enter),angle=.009*Math.sin(t*.17)+.006*Math.sin(line.id*2.3);
 // One tactile page lives in the scene while words arrive on the actual sung timing.
 object(g,cam,95,cx,cy,t,0,c=>{paper(c,0,0,1650,370,dark?'ink':'paper',angle,400+line.id);},{heavy:true,dy:55,tilt:.015});
 // A softly recessed trace of the preceding line connects stanzas without competing with the current line.
 if(line.id>0&&revealT>.30){g.save();cameraLayer(g,-100,cam);g.globalAlpha=.30*smooth((revealT-.30)/.45);arabic(g,MU.lyric_lines[line.id-1].text,1670,255,76,P.paper,{family:'Amiri',weight:400,maxWidth:1450});g.restore();}
 let cursor=total/2;
 for(let i=0;i<line.words.length;i++){
  const w=line.words[i],width=widths[i],x=cursor-width/2;cursor-=width+space;
  const dt=t-w.start;if(dt<-.035)continue;
  const active=t<w.end+.12,settle=spring(qtime(Math.max(0,dt)),225,24);
  const reveal=clamp((dt+.035)/Math.max(.12,Math.min(.48,(w.end-w.start)*.68)));
  const float=active?(Math.sin(t*3.1+i*.6)*6.0*energy):0;
  g.save();cameraLayer(g,125+(active?12:0),cam);g.translate(cx,cy);g.rotate(angle);g.translate(x,62+27*(1-settle)+float);
  const sc=1+(active?.045*pulse:0);g.scale(sc,sc);g.rotate((1-settle)*.034*(i%2?1:-1));
  g.globalAlpha=smooth((dt+.035)/.09);g.save();g.beginPath();g.rect(width/2-width*reveal-12,-size*1.42,width*reveal+24,size*2.08);g.clip();
  arabic(g,w.text,width/2,0,size,active?(dark?P.redLight:P.red):(dark?P.ivory:P.ink),{family:'Amiri',weight:400});g.restore();
  if(active&&reveal>.6){g.globalAlpha=.28;trace(g,[[-width*.43,37],[width*.43,37]],smooth((dt-.15)/.35),dark?P.redLight:P.red,3.3);}
  g.restore();
 }
}
function drawMuwashah(g,cam,t){
 const e=musicEnergy(t),pulse=musicPulse(t),list=MU.lyric_lines;
 let i=0;for(let n=0;n<list.length;n++)if(t>=list[n].start)i=n;
 const line=list[i];
 // Warm light breathes with the performance; amplitude is deliberately restrained to avoid flashing.
 g.save();g.globalCompositeOperation='screen';g.globalAlpha=.065+.045*e;g.translate(1740+22*Math.sin(t*.1),-100);g.rotate(.37);const light=g.createLinearGradient(-560,0,200,0);light.addColorStop(0,'rgba(228,178,108,0)');light.addColorStop(.55,'rgba(228,178,108,.65)');light.addColorStop(1,'rgba(228,178,108,0)');g.fillStyle=light;g.fillRect(-560,0,850,1450);g.restore();
 musicWater(g,cam,t,e);musicRain(g,cam,t,line,e);
 // A genuine Alhambra silhouette joins the reprise at the word 'الأندلس'.
 if(i>=2){const a=smooth((t-list[2].start)/1.4);imageLayer(g,A.palace,'palace',900,995,1390,1390/A.palace.width*A.palace.height,-15,cam,-.015,a*.65,true);}
 if(t<3.3){g.save();cameraLayer(g,30,cam);g.globalAlpha=smooth(t/.35)*(1-smooth((t-2.1)/1.2));arabic(g,'حين يصبح النقش غناء',1690,220,61,P.ivory,{maxWidth:1450});g.restore();}
 wordLine(g,cam,line,t,e,pulse);singingThread(g,cam,t,e,pulse);
 // The final sung syllable is allowed to finish; the page settles over the instrumental tail.
 
}
function drawPersonalCredits(g,cam,t){
 g.fillStyle='rgba(11,17,13,.76)';g.fillRect(0,0,W,H);
 label(g,cam,'المونتاج والتصميم بواسطة',960,327,66,t,.08,{align:'center',maxWidth:1600,dx:0,dy:27});
 label(g,cam,'شذى ياسر',960,604,240,t,.35,{align:'center',family:'Amiri',weight:400,maxWidth:1450,dx:0,dy:40});
 g.save();cameraLayer(g,80,cam);trace(g,curve([520,710],[780,750],[1140,680],[1400,716]),smooth((t-.6)/1.4),P.redLight,5);g.restore();
 label(g,cam,'موشح «جادك الغيث» · تسجيل «En al-Ándalus» لسامي يوسف',960,795,35,t,.8,{align:'center',maxWidth:1700,dx:0,dy:12});
 object(g,cam,55,960,875,t,1,c=>{latin(c,'Images: Jebulon · Enrique · Miquel Rosselló Calafell',0,0,27);latin(c,'Muqarnas: Sharon Mollerus · CC BY 2.0',0,49,27);latin(c,'creativecommons.org/licenses/by/2.0 · Full credits in CREDITS.md',0,94,24);},{heavy:true,dx:0,dy:12});
 if(t>6.4){g.fillStyle=`rgba(10,15,12,${smooth((t-6.4)/.6)})`;g.fillRect(0,0,W,H);}
}

function sceneContent(g,cam,s,globalT){
 const t=globalT-s.from,q=qtime(t),phase=Math.floor(q/2.6),end=s.to-s.from;
 stage(g,cam,s,t);
 switch(s.type){
 case 'muwashah':drawMuwashah(g,cam,t);break;
 case 'credits-personal':drawPersonalCredits(g,cam,t);break;
 case 'stone':titleBlock(g,cam,s,t,{y:385,size:232,width:700});redThread(g,cam,t);break;
 case 'inscription':
  photoNode(g,cam,'inscription',510,560,680,820,t,0,-.055,90);titleBlock(g,cam,s,t,{y:302,size:170});
  object(g,cam,210,1455,765,t,.8,(c)=>{c.save();c.beginPath();c.arc(0,0,175,0,Math.PI*2);c.clip();c.drawImage(A.inscription,-240,-250,520,520);c.restore();c.strokeStyle=P.redLight;c.lineWidth=6;c.beginPath();c.arc(0,0,182,0,Math.PI*2);c.stroke();trace(c,[[126,138],[215,241]],1,P.ink,23);},{heavy:true});redThread(g,cam,t);break;
 case 'centuries':
  for(let i=0;i<8;i++)object(g,cam,15+i*17,480+i*24,875-i*88,t,i*.12,c=>{paper(c,0,0,610-i*12,110,i===7?'red':'paper',-.075,100+i);},{heavy:true,dy:150});
  label(g,cam,'نحو',1720,235,55,t,.2);label(g,cam,'٨',1470,790,560,t,.3,{family:'Alexandria',weight:700,maxWidth:650});label(g,cam,'قرون',1760,792,142,t,.5,{family:'Amiri',weight:400,maxWidth:420});redThread(g,cam,t);break;
 case 'map':case 'decline':
  object(g,cam,20,615,560,t,0,c=>mapGraphic(c,q,s.type==='decline'),{heavy:true,dy:90});titleBlock(g,cam,s,t,{y:342,size:s.type==='map'?188:126,width:800});
  if(q>2.4)cutNode(g,cam,'palace',1450,846,610,t,2.4,190);redThread(g,cam,t);break;
 case 'sky':
  photoNode(g,cam,'dawn',850,726,1620,610,t,0,-.025,-5);label(g,cam,s.title,1745,328,145,t,.25,{family:'Amiri',weight:400,maxWidth:1330});tag(g,cam,'غرناطة',360,940,t,1.2,270,'paper',47);redThread(g,cam,t,1);break;
 case 'layers':
  for(let i=0;i<3;i++)object(g,cam,20+i*65,639,889-i*110,t,i*.17,c=>{paper(c,0,0,1100,190,i===0?'red':'paper',-.06,210+i);c.strokeStyle='rgba(37,42,34,.35)';c.lineWidth=3;for(let j=0;j<6;j++)c.strokeRect(-450+j*155,-38,122,76);},{heavy:true});
  cutNode(g,cam,'palace',645,501,1160,t,.35,210,-.035);titleBlock(g,cam,s,t,{y:518,size:300,width:560});
  ['حجر','هندسة','حكاية'].forEach((x,i)=>tag(g,cam,x,280+i*385,967-i*10,t,1.1+i*.5,260,'ink',45));redThread(g,cam,t);break;
 case 'poem':case 'dream':case 'verse':case 'motto':case 'closing':
  if(s.type==='closing'){cutNode(g,cam,'palace',910,895,1670,t,.1,-25);}
  if(s.type==='motto'){photoNode(g,cam,'inscription',450,557,615,745,t,0,-.06,70);for(let i=0;i<3;i++)label(g,cam,'ولا غالب إلا الله',1700,550+i*130,70,t,1.2+i*.8,{family:'Amiri',weight:400,maxWidth:850,color:i===2?P.redLight:P.paper});}
  else if(s.type==='verse'){
   object(g,cam,10,960,590,t,.05,c=>paper(c,0,0,1650,570,'ink',-.018,11),{heavy:true});
   label(g,cam,s.title,1690,520,105,t,.35,{family:'Amiri',weight:400,maxWidth:1470});label(g,cam,s.subtitle,1650,720,105,t,3.1,{family:'Amiri',weight:400,maxWidth:1470});
  }else if(s.type==='poem'){
   object(g,cam,25,960,557,t,0,c=>{paper(c,0,0,1570,640,'paper',-.032,44);for(let i=0;i<5;i++)arch(c,-550+i*270,70,225,420,'rgba(40,44,34,.14)',3);},{heavy:true});
   label(g,cam,s.eyebrow,1620,346,63,t,.25,{color:P.ink,maxWidth:1000});label(g,cam,s.title,1630,756,410,t,.5,{family:'Amiri',weight:400,color:P.ink,maxWidth:1380});
  }else{
   label(g,cam,s.title,1740,s.type==='closing'?405:510,s.type==='closing'?135:118,t,.3,{family:'Amiri',weight:400,maxWidth:1530});
   if(s.subtitle)tag(g,cam,s.subtitle,1320,s.type==='closing'?560:695,t,1.2,790,'ink',52);
  }
  redThread(g,cam,t);break;
 case 'hero':case 'home':case 'resistance':
  cutNode(g,cam,'palace',920,840,1730,t,0,-15,-.01);label(g,cam,s.title,1740,380,s.type==='hero'?290:160,t,.2,{family:'Amiri',weight:400,maxWidth:1500});
  if(s.subtitle)tag(g,cam,s.subtitle,1350,548,t,1.1,800,'ink',60);
  if(q>4.7)tag(g,cam,s.detail||'غرناطة',450,937,t,4.7,490,'paper',46);redThread(g,cam,t);break;
 case 'year':case 'fall':
  object(g,cam,20,633,585,t,0,c=>{paper(c,0,0,945,720,'ink',-.075,155);for(let i=0;i<7;i++)trace(c,[[-390,-245+i*70],[380,-245+i*70]],1,'rgba(35,37,30,.11)',2);},{heavy:true});
  label(g,cam,s.title,1708,665,335,t,.3,{family:'Alexandria',weight:700,maxWidth:1480});tag(g,cam,s.subtitle,1390,840,t,1.2,640,'red',54);
  if(s.type==='year')tag(g,cam,'غرناطة',478,813,t,2.8,330,'ink',52);else object(g,cam,180,540,650,t,2.2,keyGraphic,{heavy:true,dy:55});redThread(g,cam,t);break;
 case 'founder':case 'poet':
  object(g,cam,50,560,550,t,0,c=>{paper(c,0,0,775,825,'paper',-.07,196);for(let i=0;i<11;i++){trace(c,[[-290,-300+i*57],[270-(i%3)*70,-300+i*57]],1,'rgba(40,43,32,.18)',2);}arabic(c,s.type==='founder'?'نصر':'شعر',20,40,250,P.ink,{align:'center',family:'Amiri',weight:400,maxWidth:650});disc(c,180,250,95,P.red);arabic(c,s.type==='founder'?'غرناطة':'الأندلس',180,278,48,P.paper,{align:'center',family:'Amiri',weight:400,maxWidth:170});},{heavy:true,dy:80});
  titleBlock(g,cam,s,t,{y:350,size:s.type==='founder'?170:100,width:880,tagWidth:800,subSize:48});
  if(q>4)label(g,cam,s.type==='founder'?'من الاسم… إلى السلالة':'من الشعر… إلى الذاكرة',1710,850,54,t,4,{maxWidth:900});redThread(g,cam,t);break;
 case 'foundation':
  for(let i=0;i<5;i++)object(g,cam,10+i*45,440+i*62,905-i*93,t,i*.22,c=>paper(c,0,0,720,140,i===0?'red':'paper',-.06,350+i),{heavy:true,dy:150});
  cutNode(g,cam,'stone-hero',642,510,650,t,.4,230,-.04);titleBlock(g,cam,s,t,{y:350,size:150,width:820});redThread(g,cam,t);break;
 case 'aqueduct':case 'growth':
  object(g,cam,30,660,590,t,0,c=>{
   paper(c,0,0,1130,700,'paper',-.04,177);c.save();c.rotate(-.04);
   c.fillStyle='#b5ac88';c.beginPath();c.moveTo(-510,210);for(let i=0;i<=24;i++)c.lineTo(-510+i*43,120-Math.sin(i*.22)*65-i*4);c.lineTo(520,300);c.lineTo(-510,300);c.fill();
   const pp=curve([-500,100],[-180,160],[110,-60],[500,-90]);trace(c,pp,1,'#8d947e',21);trace(c,pp,smooth((q-.5)/3.4),'#416f79',12);
   for(let i=0;i<7;i++){const x=-420+i*140,y=125-Math.sin(i*.4)*50-i*8;arch(c,x,y+110,100,145,'#6d7562',4);}
   for(let i=0;i<12;i++){const x=-430+i*80,p=spring(q-1.6-i*.05,180,24);if(p>0){trace(c,[[x,215],[x-8,215-p*72]],1,'#6a7954',4);trace(c,[[x-5,190],[x-32,167]],clamp(p),'#6a7954',4);}}
   c.restore();
  },{heavy:true,dy:60});titleBlock(g,cam,s,t,{y:350,size:s.type==='aqueduct'?220:133,width:760});redThread(g,cam,t);break;
 case 'red':case 'return':
  cutNode(g,cam,'stone-hero',600,610,830,t,.05,250,-.035);titleBlock(g,cam,s,t,{y:345,size:s.type==='red'?195:155,width:880});
  if(s.type==='red')for(let i=0;i<3;i++)object(g,cam,120+i*15,1110+i*205,825,t,2.2+i*.7,c=>{paper(c,0,0,170,125,'red',-.06+i*.06,601+i);},{heavy:false});
  else if(q>4.7)photoNode(g,cam,'inscription',1505,800,450,275,t,4.7,-.025,70);
  redThread(g,cam,t);break;
 case 'patrons':
  titleBlock(g,cam,{...s,subtitle:'',detail:''},t,{y:260,size:125,width:1420,x:1760});
  [s.subtitle,s.detail].forEach((str,i)=>object(g,cam,70+i*65,590+i*720,650,t,.4+i*1.5,c=>{paper(c,0,0,620,520,i?'paper':'ink',i?.035:-.035,40+i);arch(c,0,20,360,370,i?P.ink:P.paper,4);arabic(c,str,0,45,68,i?P.ink:P.paper,{align:'center',maxWidth:540});},{heavy:true}));redThread(g,cam,t);break;
 case 'transformation':
  photoNode(g,cam,'myrtles',640,610,930,650,t,0,-.04,30);titleBlock(g,cam,s,t,{y:350,size:123,width:770});
  for(let i=0;i<4;i++)object(g,cam,180,1170+i*175,885,t,1+i*.55,c=>arch(c,0,0,120,190,P.paper,5),{heavy:true});redThread(g,cam,t);break;
 case 'pool':
  photoNode(g,cam,'myrtles',637,580,920,785,t,0,-.025,100);titleBlock(g,cam,s,t,{y:350,size:150,width:760});
  object(g,cam,170,1450,750,t,1,c=>{const poly=[[-280,150],[280,150],[125,-150],[-125,-150]];c.beginPath();poly.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle='#263f3e';c.fill();c.save();c.clip();for(let i=0;i<12;i++){const y=-130+i*26;trace(c,[[-300,y+Math.sin(globalT*.8+i)*3],[300,y+Math.sin(globalT*.8+i)*3]],1,'rgba(225,218,188,.42)',2);}c.restore();arch(c,0,-178,200,250,P.paper,3);},{heavy:true});redThread(g,cam,t);break;
 case 'court':case 'lions':
  photoNode(g,cam,'lions',625,590,950,745,t,0,-.03,100);titleBlock(g,cam,s,t,{y:355,size:s.type==='lions'?260:145,width:780,tagWidth:700});
  if(s.type==='lions')object(g,cam,120,1430,790,t,.6,c=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,p=spring(q-.5-i*.13,240,25);disc(c,Math.cos(a)*160,Math.sin(a)*120,Math.max(.1,14*p),i%3?P.paper:P.redLight);}c.beginPath();c.ellipse(0,0,100,60,0,0,Math.PI*2);c.strokeStyle=P.paper;c.lineWidth=4;c.stroke();},{heavy:true});redThread(g,cam,t);break;
 case 'columns':
  object(g,cam,40,640,590,t,0,c=>{paper(c,0,0,1000,690,'paper',-.035,187);for(let i=0;i<124;i++){const x=-435+(i%31)*29,y=-210+Math.floor(i/31)*135,p=clamp((q-.1-i*.015)/.35);c.fillStyle=i%31===0?P.red:'#4a5544';c.fillRect(x,y+83*(1-p),12,83*p);c.fillRect(x-4,y,20,5*p);}}, {heavy:true});titleBlock(g,cam,s,t,{y:430,size:270,width:750});tag(g,cam,'تمثيل للعدد، لا مخطط للموقع',640,960,t,2,790,'ink',32);redThread(g,cam,t);break;
 case 'rim':
  photoNode(g,cam,'lions',640,615,995,705,t,0,-.035,80);titleBlock(g,cam,s,t,{y:340,size:127,width:790});
  object(g,cam,170,1410,797,t,1,c=>{c.strokeStyle=P.paper;c.lineWidth=7;c.beginPath();c.ellipse(0,0,275,84,-.07,0,Math.PI*2);c.stroke();c.lineWidth=2;c.beginPath();c.ellipse(0,0,242,62,-.07,0,Math.PI*2);c.stroke();arabic(c,'شعرٌ على حافة الحوض',0,20,43,P.paper,{align:'center',maxWidth:500});},{heavy:true});redThread(g,cam,t);break;
 case 'dome':
  photoNode(g,cam,'dome',626,555,920,900,t,0,-.03,150);titleBlock(g,cam,s,t,{y:320,size:150,width:800});
  object(g,cam,210,1430,766,t,.9,c=>{for(let i=0;i<24;i++){let a=i*Math.PI*2/24,r=90+(i%3)*67,p=spring(q-.8-i*.035,170,24);star(c,Math.cos(a)*r,Math.sin(a)*r,Math.max(.1,25*p),i%4?P.paper:P.redLight,a);}}, {heavy:true});redThread(g,cam,t);break;
 case 'sound':
  photoNode(g,cam,'inscription',470,532,630,745,t,0,-.06,50);
  label(g,cam,'الشعر لا يكتب فقط',1760,174,52,t,.12,{maxWidth:850});
  label(g,cam,'بل يغنى',1760,438,195,t,.32,{family:'Amiri',weight:400,maxWidth:840});
  tag(g,cam,'من النقش إلى اللحن',1440,584,t,.85,640,'ink',48);
  object(g,cam,130,1375,790,t,1.3,c=>waveform(c,globalT,800),{continuous:true,dy:15});redThread(g,cam,t);break;
 case 'key':
  object(g,cam,220,650,550,t,.0,keyGraphic,{heavy:true,dy:90,tilt:.09});titleBlock(g,cam,s,t,{y:370,size:175,width:800});photoNode(g,cam,'dawn',585,899,790,230,t,2.1,-.045,-10);redThread(g,cam,t);break;
 case 'sigh':
  photoNode(g,cam,'dawn',660,660,1130,710,t,0,-.025,-10);titleBlock(g,cam,s,t,{y:342,size:140,width:800});tag(g,cam,'رواية شعبية',1440,898,t,.3,500,'red',47);redThread(g,cam,t);break;
 case 'change':case 'archive':
  for(let i=0;i<3;i++)object(g,cam,-15+i*55,510+i*86,620-i*48,t,i*.65,c=>{paper(c,0,0,750,640,i===0?'red':'paper',-.10+i*.055,335+i);for(let j=0;j<9;j++)trace(c,[[-285,-220+j*57],[270-(j%3)*35,-220+j*57]],1,'rgba(34,39,29,.18)',2);},{heavy:true});
  photoNode(g,cam,'dawn',610,550,650,380,t,1.25,-.03,180);titleBlock(g,cam,s,t,{y:350,size:128,width:720});
  if(q>5)tag(g,cam,s.type==='change'?'الأثر يبقى':'الحمراء تعود إلى العالم',1410,890,t,5,680,'red',44);redThread(g,cam,t);break;
 case 'visitors':
  cutNode(g,cam,'palace',620,670,1110,t,.0,50);label(g,cam,'نحو',1720,225,48,t,.1);label(g,cam,s.title,1765,465,170,t,.3,{family:'Alexandria',weight:700,maxWidth:850});tag(g,cam,'زائر خلال ٢٠٢٥',1420,610,t,1.0,680,'ink',49);
  object(g,cam,120,1430,820,t,1.4,c=>{for(let i=0;i<80;i++){const p=smooth((q-1.3-i*.025)/.4);disc(c,-280+(i%20)*30,-60+Math.floor(i/20)*40,Math.max(.1,6*p),i%10?P.paper:P.redLight);}}, {heavy:true});label(g,cam,'المصدر: حكومة الأندلس',1750,1005,28,t,3.4,{maxWidth:780});redThread(g,cam,t);break;
 case 'credits':
  g.fillStyle='rgba(12,18,14,.72)';g.fillRect(0,0,W,H);label(g,cam,s.title,1700,360,155,t,0,{family:'Amiri',weight:400,maxWidth:1480});
  label(g,cam,'صور ومراجع بصرية',1680,515,52,t,.12,{maxWidth:1450});
  object(g,cam,80,960,635,t,.1,c=>{
   latin(c,'Jebulon · Enrique · Miquel Rosselló Calafell',0,0,33);
   latin(c,'Muqarnas: Sharon Mollerus · CC BY 2.0',0,80,33);
   latin(c,'creativecommons.org/licenses/by/2.0',0,135,27);
   arabic(c,'التعليق والموسيقى من الملفات المقدّمة · المصادر والتراخيص في المستودع',0,235,33,P.paper,{align:'center',maxWidth:1600});
  },{heavy:true,dy:10});break;
 default:titleBlock(g,cam,s,t);redThread(g,cam,t);
 }
}
const random=rng(14921238),dust=Array.from({length:76},()=>({x:random()*2400-240,y:random()*1400-160,z:random()*680-300,r:.45+random()*1.75,vx:2+random()*7,vy:1+random()*4,phase:random()*Math.PI*2}));
function optics(g,cam,t){
 // Moving warm shaft; the beam is part of the scene lighting, not decorative UI glow.
 g.save();g.globalCompositeOperation='screen';g.globalAlpha=.11;g.translate(-140+65*Math.sin(t*.037),-80);g.rotate(-.32+.025*Math.sin(t*.029));const beam=g.createLinearGradient(0,0,850,0);beam.addColorStop(0,'rgba(216,155,86,0)');beam.addColorStop(.3,'rgba(216,155,86,.56)');beam.addColorStop(.55,'rgba(216,155,86,.22)');beam.addColorStop(1,'rgba(216,155,86,0)');g.fillStyle=beam;g.fillRect(0,0,850,1550);g.restore();
 for(const d of dust){const x=((d.x+d.vx*t+240)%2400)-240,y=((d.y-d.vy*t+160+1400*20)%1400)-160,illum=Math.exp(-(((x-400-y*.16)/360)**2)),alpha=illum*(.10+.12*(.5+.5*Math.sin(t*.57+d.phase)));if(alpha<.03)continue;g.save();cameraLayer(g,d.z,cam);g.globalAlpha=alpha;disc(g,x,y,d.r,'#f8dab0');g.restore();}
 const v=g.createRadialGradient(960,500,370,960,540,1150);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(7,13,10,.31)');g.fillStyle=v;g.fillRect(0,0,W,H);
}

function musicBridge(g,t){
 const mode=window.MUSIC_SECTION;
 if(mode==='music'&&t<.32&&A.bridgeIn){g.save();g.globalAlpha=1-smooth(t/.32);g.drawImage(A.bridgeIn,0,0,W,H);g.restore();}
 if(mode==='music'&&t>MU.music_duration-.35&&A.bridgeOut){g.save();g.globalAlpha=smooth((t-MU.music_duration+.35)/.35);g.drawImage(A.bridgeOut,0,0,W,H);g.restore();}
 if(mode==='credits'&&t<.32&&A.creditBridge){g.save();g.globalAlpha=1-smooth(t/.32);g.drawImage(A.creditBridge,0,0,W,H);g.restore();}
 if(mode==='credits'&&t>6.4){g.fillStyle=`rgba(7,12,9,${smooth((t-6.4)/.6)})`;g.fillRect(0,0,W,H);}
}

function draw(t){t=clamp(t,0,window.CINEMATIC_CONFIG.duration-1/FPS);t=Math.round(t*FPS)/FPS;const s=sceneAt(t),cam=camera(t),g=document.getElementById('film').getContext('2d',{alpha:false});
 if(sceneCacheId!==s.id){SURF.clear();for(const key of [...BLUR.keys()])if(key.startsWith('photo-'))BLUR.delete(key);sceneCacheId=s.id;}
 g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.filter='none';g.fillStyle=P.ink;g.fillRect(0,0,W,H);
 const idx=scenes.indexOf(s),dt=t-s.from;
 // A short dimensional paper-matte bridge: only the transition mask is screen-space.
 if(idx>0&&dt<.3125&&!(window.MUSIC_SECTION==='resume'&&s.type==='poet')){const prev=scenes[idx-1];sceneContent(g,cam,prev,t);const p=smooth(dt/.3125),edge=W*(1-p),r=rng(501+idx);g.save();g.beginPath();g.moveTo(W+30,-30);g.lineTo(edge,-30);for(let y=0;y<H+40;y+=36)g.lineTo(edge+(r()-.5)*15,y);g.lineTo(W+30,H+30);g.closePath();g.clip();sceneContent(g,cam,s,t);g.restore();}
 else sceneContent(g,cam,s,t);
 optics(g,cam,t);musicBridge(g,t);return{time:t,frame:Math.round(t*FPS),scene:s.id,camera:cam};
}
window.seek=draw;
window.Cinematic={fps:FPS,width:W,height:H,camera,focusAt,spring,stopMotionFps:8,scenes};
window.filmReady=(async()=>{
 await Promise.all(Object.entries(window.CINEMATIC_ASSETS).map(([k,u])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{A[k]=im;resolve();};im.onerror=()=>reject(new Error('Asset failed: '+k));im.src=u;})));
 await document.fonts.ready;await document.fonts.load('700 64px Alexandria','الحمراء');await document.fonts.load('400 64px Amiri','قصيدة');
 draw(0);document.documentElement.dataset.ready='true';return true;
})();
})();
