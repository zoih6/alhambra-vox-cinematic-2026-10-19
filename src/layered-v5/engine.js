/* V5: legacy entrance transforms and global wipe renderer removed. Native independent-layer compositor below. */
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

function cameraLayer(g,z,cam){const p=F/(F-z-cam.dolly),p0=F/(F-z-REF_DOLLY),sc=p/p0;g.translate(W/2-cam.x*p,H/2-cam.y*p);g.rotate(cam.roll);g.scale(sc,sc);g.translate(-W/2,-H/2);}
function ctxFont(g,size,weight=650,family='Alexandria'){g.font=`${weight} ${size}px "${family}"`;g.direction='rtl';g.textBaseline='alphabetic';}

function latin(g,str,x,y,size=30,color=P.ivory){g.save();g.direction='ltr';g.font=`500 ${size}px "Alexandria",sans-serif`;g.fillStyle=color;g.textAlign='center';g.fillText(str,x,y);g.restore();}
function pathTorn(g,w,h,seed=12,rough=6){const r=rng(seed);g.beginPath();g.moveTo(-w/2,-h/2);for(let i=1,n=Math.ceil(w/35);i<=n;i++)g.lineTo(-w/2+w*i/n,-h/2+(r()-.5)*rough*2);for(let i=1,n=Math.ceil(h/35);i<=n;i++)g.lineTo(w/2+(r()-.5)*rough*2,-h/2+h*i/n);for(let i=1,n=Math.ceil(w/35);i<=n;i++)g.lineTo(w/2-w*i/n,h/2+(r()-.5)*rough*2);for(let i=1,n=Math.ceil(h/35);i<=n;i++)g.lineTo(-w/2+(r()-.5)*rough*2,h/2-h*i/n);g.closePath();}


function curve(a,b,c,d,n=80){const q=[];for(let i=0;i<=n;i++){let t=i/n,u=1-t;q.push([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]]);}return q;}
function disc(g,x,y,r,c){g.beginPath();g.arc(x,y,Math.max(.01,r),0,Math.PI*2);g.fillStyle=c;g.fill();}
function star(g,x,y,r,c,rotation=0){g.save();g.translate(x,y);g.rotate(rotation);g.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8,rr=i%2?r*.69:r;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fillStyle=c;g.fill();g.restore();}

function imageCover(g,im,x,y,w,h,fy=.5){const k=Math.max(w/im.width,h/im.height),sw=w/k,sh=h/k;g.drawImage(im,(im.width-sw)/2,(im.height-sh)*fy,sw,sh,x,y,w,h);}
function getSurface(key,w,h,fn){if(SURF.has(key))return SURF.get(key);const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);fn(c.getContext('2d'),c.width,c.height);SURF.set(key,c);return c;}
function photoSurface(key,w,h){return getSurface(`photo-${key}-${w}-${h}`,w+100,h+100,(g,cw,ch)=>{g.translate(cw/2,ch/2);pathTorn(g,w+15,h+15,31,5);g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=26;g.shadowOffsetY=16;g.fillStyle=P.paper;g.fill();g.shadowColor='transparent';pathTorn(g,w,h,31,5);g.clip();g.filter='saturate(.72) contrast(1.04)';imageCover(g,A[key],-w/2,-h/2,w,h,.55);});}
function getBlur(im,key,radius){const n=[0,1.5,3.5,6.5],b=clamp(radius,0,6.5);let hi=n.findIndex(x=>x>=b);if(hi<0)hi=3;let lo=Math.max(0,hi-1);if(b===0)lo=hi=0;const res=[];for(const k of new Set([lo,hi])){const id=key+'#'+n[k];if(!BLUR.has(id)){if(n[k]===0)BLUR.set(id,im);else{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.filter=`blur(${n[k]}px)`;g.drawImage(im,0,0);BLUR.set(id,c);}}res[k]=BLUR.get(id);}return{a:res[lo],b:res[hi],mix:hi===lo?0:(b-n[lo])/(n[hi]-n[lo])};}







const waterTypes=new Set(['pool','court','lions','columns','rim','dome','motto','sound','verse','poet','growth','transformation','patrons','credits']);



function keyGraphic(g){
 g.save();g.rotate(-.42);g.strokeStyle=P.gold;g.lineWidth=23;g.lineCap='round';g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=20;g.shadowOffsetY=14;
 g.beginPath();g.arc(-190,0,95,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(-92,0);g.lineTo(290,0);g.lineTo(290,75);g.lineTo(220,75);g.lineTo(220,34);g.stroke();g.lineWidth=8;g.strokeStyle='#e7cf93';g.beginPath();g.arc(-190,-4,95,Math.PI,Math.PI*1.8);g.stroke();g.restore();
}
function waveform(g,t,w=1000){const e=audioEnvelope[Math.min(audioEnvelope.length-1,Math.floor(t*32))]||.1;g.save();for(let i=0;i<90;i++){const a=i/89,hh=(11+e*145)*(Math.sin(i*.71+t*.5)**2*.65+.2)*Math.sin(Math.PI*a);g.fillStyle=i%9===0?P.redLight:P.paper;g.fillRect(-w/2+i*w/90,-hh,5,hh*2);}g.restore();}
function sceneContent(g,cam,s,globalT){
 const t=globalT-s.from,q=qtime(t),phase=Math.floor(q/2.6),end=s.to-s.from;
 stage(g,cam,s,t);
 switch(s.type){
 case 'stone':titleBlock(g,cam,s,t,{y:385,size:232,width:700});redThread(g,cam,t);break;
 case 'inscription':drawInscriptionV5(g,cam,s,t);break;
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
 case 'year':case 'fall':drawDateV5(g,cam,s,t);break;
 case 'founder':drawFounderV5(g,cam,s,t);break;
 case 'poet':drawPoetV5(g,cam,s,t);break;
 case 'foundation':drawFoundationV5(g,cam,s,t);break;
 case 'aqueduct':case 'growth':drawWaterV5(g,cam,s,t);break;
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
 case 'pool':drawPoolV5(g,cam,s,t);break;
 case 'court':case 'lions':
  photoNode(g,cam,'lions',625,590,950,745,t,0,-.03,100);titleBlock(g,cam,s,t,{y:355,size:s.type==='lions'?260:145,width:780,tagWidth:700});
  if(s.type==='lions')object(g,cam,120,1430,790,t,.6,c=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,p=spring(q-.5-i*.13,240,25);disc(c,Math.cos(a)*160,Math.sin(a)*120,Math.max(.1,14*p),i%3?P.paper:P.redLight);}c.beginPath();c.ellipse(0,0,100,60,0,0,Math.PI*2);c.strokeStyle=P.paper;c.lineWidth=4;c.stroke();},{heavy:true});redThread(g,cam,t);break;
 case 'columns':
  object(g,cam,40,640,590,t,0,c=>{paper(c,0,0,1000,690,'paper',-.035,187);for(let i=0;i<124;i++){const x=-435+(i%31)*29,y=-210+Math.floor(i/31)*135,p=clamp((q-.1-i*.015)/.35);c.fillStyle=i%31===0?P.red:'#4a5544';c.fillRect(x,y+83*(1-p),12,83*p);c.fillRect(x-4,y,20,5*p);}}, {heavy:true});titleBlock(g,cam,s,t,{y:430,size:270,width:750});tag(g,cam,'تمثيل للعدد، لا مخطط للموقع',640,960,t,2,790,'ink',32);redThread(g,cam,t);break;
 case 'rim':drawRimV5(g,cam,s,t);break;
 case 'dome':
  photoNode(g,cam,'dome',626,555,920,900,t,0,-.03,150);titleBlock(g,cam,s,t,{y:320,size:150,width:800});
  object(g,cam,210,1430,766,t,.9,c=>{for(let i=0;i<24;i++){let a=i*Math.PI*2/24,r=90+(i%3)*67,p=spring(q-.8-i*.035,170,24);star(c,Math.cos(a)*r,Math.sin(a)*r,Math.max(.1,25*p),i%4?P.paper:P.redLight,a);}}, {heavy:true});redThread(g,cam,t);break;
 case 'sound':
  photoNode(g,cam,'inscription',470,532,630,745,t,0,-.06,50);
  label(g,cam,'الشعر لا يكتب فقط',1760,174,52,t,.12,{maxWidth:850});
  label(g,cam,'بل يغنى',1760,438,195,t,.32,{family:'Amiri',weight:400,maxWidth:840});
  tag(g,cam,'من النقش إلى اللحن',1440,584,t,.85,640,'ink',48);
  object(g,cam,130,1375,790,t,1.3,c=>waveform(c,globalT,800),{continuous:true,dy:15});redThread(g,cam,t);break;
 case 'key':drawKeyV5(g,cam,s,t);break;
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
 layer(id,z,start,0,['parent layout transform only'],c=>{if(age<0)return;withPlane(c,z,cam,q=>{q.translate(x,y);q.rotate(opt.rotation||0);const saved=V5.inner;V5.inner={age,textIndex:0,paperIndex:0,strokeIndex:0,id,depth:z};fn(q,age);V5.inner=saved;});});
}
function label(g,cam,str,x,y,size,t,start=0,opt={}){
 const z=opt.z??495;let duration=opt.duration??1.04;const age=t-start;
 layer('type/'+str+'@'+x+','+y+'/body',z,start,duration,['native Arabic alpha body matte','ascender mask','descender mask'],c=>{if(age<0)return;withPlane(c,z,cam,q=>drawTypeMatte(q,str,x,y,size,opt.color||P.ivory,age,duration,{family:opt.family||'Alexandria',weight:opt.weight??650,maxWidth:opt.maxWidth??700,align:opt.align||'right'}));});
 V5.layers.push({name:'type/'+str+'@'+x+','+y+'/dots',depth:z,start:start+.20,duration:duration*.6,properties:['right-to-left mark apertures; positions unchanged']});
}
function paperRaster(w,h,color,seed){return getSurface('v5-paper-'+[w,h,color,seed].join('-'),w+70,h+70,(g,cw,ch)=>{g.translate(cw/2,ch/2);pathTorn(g,w,h,seed);g.clip();g.drawImage(A[color==='ink'?'charcoal':color==='red'?'red':'paper'],-w/2,-h/2,w,h);});}
function paperShadow(g,x,y,w,h,rot,age,seed=9){if(age<0)return;const p=phase(age,0,1.2);const sh=getSurface('v5-shadow-'+[w,h,seed].join('-'),w+130,h+130,(c,cw,ch)=>{c.translate(cw/2,ch/2);c.shadowColor='rgba(0,0,0,.62)';c.shadowBlur=28;c.shadowOffsetY=12;c.fillStyle='#000';pathTorn(c,w,h,seed);c.fill();});g.save();g.translate(x+lerp(-13,-6,p),y+lerp(26,12,p));g.rotate(rot);g.globalAlpha=.24*phase(age,.03,.7);g.drawImage(sh,-sh.width/2,-sh.height/2);g.restore();}
function paper(g,x,y,w,h,color='paper',rot=0,seed=10){
 const age=V5.inner?V5.inner.age-(V5.inner.paperIndex++)*.13:3;
 paperShadow(g,x,y,w,h,rot,age,seed);if(age<.08)return;const image=paperRaster(w,h,color,seed);const p=phase(age,.08,.68,'ink');g.save();g.translate(x,y);g.rotate(rot);maskShape(g,image.width,image.height,p,'angled',seed);g.drawImage(image,-image.width/2,-image.height/2);g.restore();
 V5.layers.push({name:'paper/'+seed+'/shadow',depth:V5.frame?.plan?.roles?.paper_shadow?.depth??35,start:0,duration:1.2,properties:['independent offset and density']});
}
function tag(g,cam,str,x,y,t,start=0,w=420,color='ink',size=43,opt={}){
 const age=t-start,z=opt.z??130;layer('tag/'+str+'/shadow',z-7,start,1.2,['shadow offset/density'],c=>withPlane(c,z-7,cam,q=>paperShadow(q,x,y,w,90,-.025,age,38)));
 layer('tag/'+str+'/backing',z,start+.05,.55,['torn-edge matte'],c=>{if(age<.05)return;withPlane(c,z,cam,q=>{q.translate(x,y);q.rotate(-.025);const im=paperRaster(w,90,color,38);maskShape(q,im.width,im.height,phase(age,.05,.55),'angled');q.drawImage(im,-im.width/2,-im.height/2);});});
 layer('tag/'+str+'/ink',z+2,start+.19,.76,['separate Arabic matte; parent-linked to backing'],c=>{if(age<.19)return;withPlane(c,z+2,cam,q=>{q.translate(x,y);q.rotate(-.025);drawTypeMatte(q,str,0,17,size,color==='paper'?P.ink:P.ivory,age-.19,.76,{align:'center',maxWidth:w-35});});});
}
function trace(g,pts,p=1,col=P.redLight,width=6){
 if(V5.inner){const index=V5.inner.strokeIndex++,st=.32+index*.035;p=Math.min(p,phase(V5.inner.age,st,.8,'ink'));V5.layers.push({name:'shape/'+V5.inner.id+'/path-'+index,depth:V5.inner.depth,start:st,duration:.8,properties:['independent arc-length Trim Paths']});}
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
 layer('cutout/'+key+'/shadow',z-12,start,1.25,['independent silhouette shadow'],c=>{if(age<0)return;withPlane(c,z-12,cam,q=>{q.translate(x+keyValue(age,[[0,-15],[.8,-7],[1.3,-4]]),y+keyValue(age,[[0,29],[.65,18],[1.3,10]]));q.rotate(rot);q.globalAlpha=.20*phase(age,.05,.8);const sh=getSurface('cutshadow-'+key,im.width,im.height,(a)=>{const tmp=document.createElement('canvas');tmp.width=im.width;tmp.height=im.height;const tc=tmp.getContext('2d');tc.drawImage(im,0,0);tc.globalCompositeOperation='source-in';tc.fillStyle='#000';tc.fillRect(0,0,im.width,im.height);a.filter='blur(18px)';a.drawImage(tmp,0,0);});q.drawImage(sh,-w/2,-h/2,w,h);});});
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
 layer('scene/light-flag',-40,0,0,['static type-protecting flag'],c=>{const side=c.createLinearGradient(850,0,1920,0);side.addColorStop(0,'rgba(12,17,14,0)');side.addColorStop(1,'rgba(12,17,14,.58)');c.fillStyle=side;c.fillRect(650,0,1270,1080);});
}

/* Authored scene-specific construction; the approved text and font families are retained. */
const CKEYS=[[0,-15,3,80],[3.9375,15,-3,98],[10.71875,0,0,75],[17.9375,-18,0,95],[26.09375,0,-5,110],[36.75,12,0,80],[50.6875,-22,0,90],[60.40625,10,4,100],[73.75,-10,8,86],[91.1875,15,-3,95],[105.5,-20,0,110],[121.3125,10,0,90],[133.84375,-14,4,100],[141.09375,15,-10,115],[158.59375,-10,0,85],[168.40625,0,0,95],[175.96875,0,0,95],[183.96875,20,4,105],[190.875,-14,0,86],[205.25,12,-4,95],[223.0625,-20,4,105],[238.5625,10,2,95],[250.375,-10,0,90],[265.40625,0,0,100]];
function camera(t){let i=0;while(i<CKEYS.length-2&&t>CKEYS[i+1][0])i++;const a=CKEYS[i],b=CKEYS[i+1],u=clamp((t-a[0])/(b[0]-a[0]));const p=bezierEase(u,.36,0,.64,1);return{x:lerp(a[1],b[1],p),y:lerp(a[2],b[2],p),dolly:lerp(a[3],b[3],p),roll:0,focus:focusAt(t)};}
function subjectRig(g,cam,key,x,y,height,t,start=0,opt={}){
 const rec=window.V5_SUBJECTS.assets[key],full=A['v5-'+key],w=height*full.width/full.height,age=t-start;
 cutNode(g,cam,'v5-'+key,x,y,w,t,start,210,opt.rotation||0);
 // Registered details have their own matte clocks and shallow depth. The connected anatomy is not pulled apart.
 rec.layers.forEach((p,i)=>{const b=p.bounds,xx=x+(b[0]+b[2]/2-.5)*w,yy=y+(b[1]+b[3]/2-.5)*height,ww=b[2]*w,hh=b[3]*height,st=.46+i*.15,part=A['v5-'+p.key];
  layer('subject/'+key+'/'+p.key,p.depth,start+st,1.03,['detail matte','registered depth','limited meaningful articulation'],c=>{if(age<st)return;withPlane(c,p.depth,cam,q=>{q.translate(xx,yy);const pen=key==='poet'&&p.key.includes('writing');const hand=key==='hands';const movement=pen&&age>2&&age<6?.008*Math.sin((age-2)*2.8):0;q.rotate(movement);if(hand)q.translate(0,keyValue(age,[[0,-7],[.7,-2],[1.5,0]]));maskShape(q,ww,hh,phase(age,st,1.03,'ink'),'angled');q.drawImage(part,-ww/2,-hh/2,ww,hh);});});
 });
 if(opt.legend!==false&&key!=='hands'&&key!=='key')tag(g,cam,'تصوّر تخيّلي للشخصية',x,1015,t,start+1.45,520,'ink',35,{z:610});
}
function keySubject(g,cam,x,y,w,t,start=0,rot=-.33){const im=A['v5-key'],h=w/im.width*im.height,age=t-start;
 layer('key/contact-shadow',170,start,.9,['shadow offset','density'],c=>{if(age<0)return;withPlane(c,170,cam,q=>{q.translate(x-7,y+keyValue(age,[[0,27],[.7,14],[1.3,9]]));q.rotate(rot);q.globalAlpha=.24*phase(age,0,.8);const sh=getSurface('key-shadow-v5',im.width,im.height,(a)=>{a.drawImage(im,0,0);a.globalCompositeOperation='source-in';a.fillStyle='#000';a.fillRect(0,0,im.width,im.height);});q.drawImage(sh,-w/2,-h/2,w,h);});});
 const parts=[['bow',0,.29,.12,.62,'radial'],['shaft',.24,.9,.55,.88,'angled'],['bit',.85,1,1.0,.5,'down']];
 for(const [name,left,right,st,dur,mode]of parts)layer('key/'+name,210,start+st,dur,['component track matte; physical key remains connected'],c=>{if(age<st)return;withPlane(c,210,cam,q=>{q.translate(x,y);q.rotate(rot);q.beginPath();q.rect(-w/2+w*left,-h/2-3,w*(right-left),h+6);q.clip();const ww=w*(right-left);q.save();q.translate(-w/2+w*(left+right)/2,0);maskShape(q,ww,h,phase(age,st,dur),mode);q.translate(w/2-w*(left+right)/2,0);q.drawImage(im,-w/2,-h/2,w,h);q.restore();});});
}
function drawFounderV5(g,cam,s,t){subjectRig(g,cam,'founder',565,615,1030,t,.05);titleBlock(g,cam,s,t,{y:350,size:170,width:880,tagWidth:800,subSize:48});label(g,cam,'من الاسم… إلى السلالة',1710,850,54,t,4,{maxWidth:900});redThread(g,cam,t);}
function drawPoetV5(g,cam,s,t){subjectRig(g,cam,'poet',550,610,1040,t+1.8,.05);titleBlock(g,cam,s,t,{y:350,size:100,width:880,tagWidth:800,subSize:48});label(g,cam,'من الشعر… إلى الذاكرة',1710,850,54,t,4,{maxWidth:900});redThread(g,cam,t);}
function drawFoundationV5(g,cam,s,t){
 object(g,cam,30,590,610,t,.05,c=>{paper(c,0,0,1030,735,'paper',-.025,351);for(let i=0;i<6;i++)trace(c,[[-450+i*170,-280],[-450+i*170,280]],phase(t,.55+i*.10,.75),'rgba(92,107,78,.35)',2);for(let i=0;i<6;i++)trace(c,[[-480,-250+i*90],[460,-250+i*90]],phase(t,.7+i*.10,.75),'rgba(92,107,78,.35)',2);},{});
 const full=A['v5-hands'],hh=690,ww=hh*full.width/full.height,x=590,y=585,parts=window.V5_SUBJECTS.assets.hands.construction_parts;
 parts.forEach((p,i)=>{const bb=p.bounds,px=x+(bb[0]+bb[2]/2-.5)*ww,py=y+(bb[1]+bb[3]/2-.5)*hh,pw=bb[2]*ww,ph=bb[3]*hh,st=[.22,.42,.67][i],im=A['v5-'+p.key];layer('construction/'+p.key,220,st,1.05,['independent connected-part matte','parent-aligned registration'],c=>{if(t<st)return;withPlane(c,220,cam,q=>{q.save();q.translate(590,610);pathTorn(q,1000,710,351);q.clip();q.translate(-590,-610);q.translate(px,py);maskShape(q,pw,ph,phase(t,st,1.05),i===2?'up':'down');q.drawImage(im,-pw/2,-ph/2,pw,ph);q.restore();});});});
 titleBlock(g,cam,s,t,{y:350,size:150,width:820});redThread(g,cam,t);
}
function drawInscriptionV5(g,cam,s,t){
 photoNode(g,cam,'inscription',510,560,680,820,t,0,-.055,90);titleBlock(g,cam,s,t,{y:302,size:170});
 const pts=[];for(let i=0;i<=96;i++){let a=-Math.PI/2+i*Math.PI*2/96;pts.push([1455+182*Math.cos(a),765+182*Math.sin(a)]);}
 layer('inspection/lens-ring',230,.68,.95,['circular Trim Paths'],c=>withPlane(c,230,cam,q=>trace(q,pts,phase(t,.68,.95),P.redLight,6)));
 layer('inspection/image-aperture',220,1.0,.88,['independent image aperture'],c=>{if(t<1)return;withPlane(c,220,cam,q=>{q.translate(1455,765);q.beginPath();q.arc(0,0,175*phase(t,1,.88),0,Math.PI*2);q.clip();q.drawImage(A.inscription,-240,-250,520,520);});});
 layer('inspection/handle',225,1.52,.65,['handle draw-on follows ring'],c=>withPlane(c,225,cam,q=>trace(q,[[1581,903],[1670,1006]],phase(t,1.52,.65),P.ink,23)));redThread(g,cam,t);
}
function mapGraphic(g,t,decline=false){
 paper(g,0,0,1040,735,'paper',-.035,201);g.save();g.rotate(-.035);g.beginPath();g.rect(-490,-335,980,670);g.clip();
 g.save();maskShape(g,1040,735,phase(t,.18,.65),'down');g.fillStyle='#9aa89f';g.fillRect(-490,-335,980,670);g.restore();
 const project=p=>[-490+(p[0]+11)/16*980,-335+(45-p[1])/11*670];
 for(let j=0;j<11;j++)trace(g,[[-490,-335+j*67],[490,-335+j*67]],phase(t,.4+j*.035,.65),'rgba(26,42,38,.1)',1);
 window.CINEMATIC_MAP.features.forEach((f,index)=>{g.save();maskShape(g,1040,735,phase(t,.35+index*.07,.9),'angled');const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys){g.beginPath();for(const ring of poly){ring.forEach((p,i)=>{const a=project(p);if(i)g.lineTo(...a);else g.moveTo(...a);});g.closePath();}g.fillStyle=f.properties.name==='Spain'?'#ddd3b9':f.properties.name==='Portugal'?'#bcbbaa':'#c3bda9';g.fill();g.strokeStyle='#626e61';g.lineWidth=2;g.stroke();}g.restore();});
 const p=project([-3.5881,37.1761]);disc(g,...p,13*phase(t,1.05,.36),P.red);const ring=[];for(let i=0;i<=64;i++){let a=i*Math.PI*2/64;ring.push([p[0]+28*Math.cos(a),p[1]+28*Math.sin(a)]);}trace(g,ring,phase(t,1.23,.65),P.red,3);drawTypeMatte(g,'غرناطة',p[0]+195,p[1]-42,45,P.ink,t-1.4,.6,{});
 if(decline){const cities=[[-4.78,37.89],[-5.99,37.39],[-3.78,37.77],[-4.03,39.86]];cities.forEach((p,i)=>{const a=project(p),appear=phase(t,1.9+i*.75,.35),cross=phase(t,2.25+i*.75,.55);disc(g,...a,11*appear,cross>.5?P.red:'#344337');trace(g,[[a[0]-16,a[1]-16],[a[0]+16,a[1]+16]],cross,P.red,3);});}
 g.restore();
}
function drawWaterV5(g,cam,s,t){
 object(g,cam,30,660,590,t,0,c=>{
  paper(c,0,0,1130,700,'paper',-.04,177);c.save();c.rotate(-.04);
  c.save();maskShape(c,1100,650,phase(t,.3,.85),'up');c.fillStyle='#b5ac88';c.beginPath();c.moveTo(-510,280);for(let i=0;i<=24;i++)c.lineTo(-510+i*43,-20+i*8+Math.sin(i*.22)*20);c.lineTo(520,300);c.lineTo(-510,300);c.fill();c.restore();
  for(let i=0;i<7;i++){const xx=-420+i*140,yy=45+i*10;const pts=[];for(let k=0;k<=30;k++){const a=Math.PI-k*Math.PI/30;pts.push([xx+50*Math.cos(a),yy-65*Math.sin(a)]);}pts.unshift([xx-50,215]);pts.push([xx+50,215]);trace(c,pts,phase(t,.78+i*.11,.8),'#6d7562',4);}
  const path=curve([-500,-90],[-180,-80],[120,65],[500,120]);trace(c,path,phase(t,1.1,1.0),'#8d947e',21);trace(c,path,phase(t,1.65,2.6),'#416f79',12);
  for(let i=0;i<12;i++){let xx=-430+i*80,p=phase(t,2.9+i*.055,.6);trace(c,[[xx,260],[xx-8,260-72*p]],p,'#6a7954',4);trace(c,[[xx-5,235],[xx-32,210]],p,'#6a7954',4);}
  c.restore();
 },{});titleBlock(g,cam,s,t,{y:350,size:s.type==='aqueduct'?220:133,width:760});redThread(g,cam,t);
}
function drawPoolV5(g,cam,s,t){
 photoNode(g,cam,'myrtles',637,580,920,785,t,0,-.025,100);titleBlock(g,cam,s,t,{y:350,size:150,width:760});
 object(g,cam,170,1450,750,t,1,c=>{const p=phase(t,1.25,1.2),poly=[[-280,150],[280,150],[125,-150],[-125,-150]];c.save();maskShape(c,600,320,p,'down');c.beginPath();poly.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();c.fillStyle='#263f3e';c.fill();c.clip();for(let i=0;i<12;i++){const y=-130+i*26;trace(c,[[-300,y+Math.sin(t*.7+i)*2],[300,y+Math.sin(t*.7+i)*2]],phase(t,2.2+i*.035,.85),'rgba(225,218,188,.42)',2);}c.restore();arch(c,0,-178,200,250,P.paper,3);},{});redThread(g,cam,t);
}
function drawRimV5(g,cam,s,t){photoNode(g,cam,'lions',640,615,995,705,t,0,-.035,80);titleBlock(g,cam,s,t,{y:340,size:127,width:790});
 object(g,cam,170,1410,797,t,.8,c=>{for(let k=0;k<2;k++){const p=[];for(let i=0;i<=96;i++){let a=i*Math.PI*2/96;p.push([Math.cos(a)*(275-k*33),Math.sin(a)*(84-k*22)]);}trace(c,p,phase(t,1+k*.33,1.25),P.paper,k?2:7);}drawTypeMatte(c,'شعر على حافة الحوض',0,20,43,P.paper,t-2.25,.8,{align:'center',maxWidth:500});},{});redThread(g,cam,t);}
function drawKeyV5(g,cam,s,t){keySubject(g,cam,620,570,1050,t,.08,-.33);titleBlock(g,cam,s,t,{y:370,size:175,width:800});photoNode(g,cam,'dawn',585,899,790,230,t,2.1,-.045,-10);redThread(g,cam,t);}
function drawDateV5(g,cam,s,t){object(g,cam,20,633,585,t,0,c=>{paper(c,0,0,945,720,'ink',-.075,155);for(let i=0;i<7;i++)trace(c,[[-390,-245+i*70],[380,-245+i*70]],phase(t,.1+i*.10,.6),'rgba(225,217,190,.12)',2);},{});label(g,cam,s.title,1708,665,335,t,.3,{family:'Alexandria',weight:700,maxWidth:1480,duration:1.15});tag(g,cam,s.subtitle,1390,840,t,1.2,640,'red',54);if(s.type==='year')tag(g,cam,'غرناطة',478,813,t,2.8,330,'ink',52);else keySubject(g,cam,560,640,820,t,2.1,-.33);redThread(g,cam,t);}
function ringPath(x,y,rx,ry){const p=[];for(let i=0;i<=90;i++){const a=-Math.PI/2+i*Math.PI*2/90;p.push([x+Math.cos(a)*rx,y+Math.sin(a)*ry]);}return p;}
const CH=window.V5_CHORUS;
function chorusEnergy(t){const a=CH.energy,i=Math.min(a.length-1,Math.max(0,Math.floor(t*32)));return a[i]||0;}
function chorusPulse(t){let p=0;for(const o of CH.onsets){const a=t-o.t;if(a>=0&&a<.6)p+=o.strength*Math.exp(-a*9);}return clamp(p);}
function chorusLine(t){let i=0;for(let n=0;n<CH.lines.length;n++)if(t>=CH.lines[n].start)i=n;return CH.lines[i];}
function chorusCamera(t){const D=LCFG.song_video_seconds;const keys=[[0,0,0,95],[6,-22,3,112],[12,18,-3,102],[18,-16,2,118],[24,22,0,102],[30,-20,-4,116],[36,20,2,105],[42,-12,0,120],[48,15,-4,100],[55,-17,2,115],[61,16,0,105],[D-2,0,0,95],[D,0,0,95]];let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],p=phase(t,a[0],b[0]-a[0],'inout');return{x:lerp(a[1],b[1],p),y:lerp(a[2],b[2],p),dolly:lerp(a[3],b[3],p),roll:0,focus:90};}
function lyricRow(g,cam,words,right,baseline,size,maxWidth,t,id){
 const mc=document.createElement('canvas').getContext('2d');let widths,space,total;
 do{ctxFont(mc,size,400,'Amiri');widths=words.map(w=>mc.measureText(w.text).width);space=size*.20;total=widths.reduce((a,b)=>a+b,0)+space*(widths.length-1);if(total>maxWidth)size--;}while(total>maxWidth&&size>85);
 const start=words[0].start,until=words.at(-1).end,backW=Math.min(maxWidth+70,total+90),cx=right-total/2;
 layer('chorus/'+id+'/paper-shadow',120,start-.18,1.0,['independent shadow'],c=>withPlane(c,120,cam,q=>paperShadow(q,cx,baseline-size*.23,backW,size*1.35,-.015,t-start+.18,700+id.length)));
 layer('chorus/'+id+'/backing',130,start-.18,.65,['custom torn-edge matte'],c=>{const age=t-start+.18;if(age<0)return;withPlane(c,130,cam,q=>{q.translate(cx,baseline-size*.23);q.rotate(-.015);const im=paperRaster(backW,size*1.35,'ink',700+id.length);let p=phase(age,0,.65);if(t>LCFG.song_video_seconds-1.2)p*=1-phase(t,LCFG.song_video_seconds-1.2,.9);maskShape(q,im.width,im.height,p,'angled');q.drawImage(im,-im.width/2,-im.height/2);});});
 let x=right;
 words.forEach((w,i)=>{const ww=widths[i],xx=x;x-=ww+space;let age=t-w.start,dur=Math.max(.16,Math.min(.60,(w.end-w.start)*.66)),active=t>=w.start&&t<w.end+.06;
  layer('chorus/'+id+'/word-'+i+'/body-dots',133,w.start,dur,['native connected Arabic body, ascender, descender and dot masks'],c=>{if(age<0)return;withPlane(c,133,cam,q=>{let out=1;if(t>LCFG.song_video_seconds-1.0)out=1-phase(t,LCFG.song_video_seconds-1.0+i*.04,.55);q.save();q.translate(xx-ww/2,baseline);maskShape(q,ww+50,size*2,out,'angled');q.translate(-xx+ww/2,-baseline);drawTypeMatte(q,w.text,xx,baseline,size,active?P.redLight:P.ivory,age,dur,{family:'Amiri',weight:400});q.restore();});});
  layer('chorus/'+id+'/word-'+i+'/underline',450,w.start+.10,Math.max(.24,w.end-w.start),['separate Trim Paths; reacts to measured beat without moving the word'],c=>{if(!active)return;withPlane(c,133,cam,q=>{const y=baseline+size*.25+chorusPulse(t)*2;trace(q,[[xx-ww+5,y],[xx-4,y]],phase(t,w.start+.1,Math.max(.24,w.end-w.start)),P.redLight,2.8);});});
 });
}
function chorusPalace(g,cam,t,start){
 const im=A.palace,w=1620,h=w*im.height/im.width,x=870,y=930;
 for(const [name,lo,hi,st,dir,z]of [['terrain',.42,1,0,'up',105],['architecture',0,.59,.35,'up',145]]){
  layer('chorus/palace/'+name,z,start+st,1.25,['separate photographic zone matte','depth parallax'],c=>{if(t<start+st)return;withPlane(c,z,cam,q=>{q.translate(x,y);q.beginPath();q.rect(-w/2,-h/2+h*lo,w,h*(hi-lo));q.clip();const exit=1-phase(t,LCFG.song_video_seconds-(name==='terrain'?1.0:.85),.6);maskShape(q,w,h,phase(t,start+st,1.25)*exit,dir);q.drawImage(im,-w/2,-h/2,w,h);});});
 }
}
function drawChorusV5(g,cam,t){
 const l=chorusLine(t),age=t-l.start,e=chorusEnergy(t),pulse=chorusPulse(t);const world=l.world;
 if(world==='rain-arch'){
  V5.frame.plan.photo_mask='vertical-epigraphy';photoNode(g,cam,'inscription',500,570,650,790,t,l.start-.15,-.045,90);
  layer('chorus/rain-ink',165,l.start,.6,['rain strokes tied to the word الغيث'],c=>withPlane(c,165,cam,q=>{const w=l.words.find(w=>w.text==='الغيث'&&t>w.start&&t<w.end+.4);if(!w)return;const random=rng(2500+l.id);for(let i=0;i<22;i++){const x=200+random()*1450,y=140+((t-w.start)*145+random()*650)%760;trace(q,[[x,y],[x-6,y+21]],phase(t,w.start,.3),'rgba(239,223,191,.20)',1.4);}}));
  lyricRow(g,cam,l.words.slice(0,2),1730,445,208,845,t,'rain-a-'+l.id);lyricRow(g,cam,l.words.slice(2),1730,688,174,845,t,'rain-b-'+l.id);
 }else if(world==='mirror-dream'){
  V5.frame.plan.photo_mask='facade-then-water-reflection';photoNode(g,cam,'myrtles',550,585,820,760,t,l.start-.12,-.03,80);
  lyricRow(g,cam,l.words.slice(0,3),1740,430,170,810,t,'dream-a-'+l.id);lyricRow(g,cam,l.words.slice(3),1740,690,220,810,t,'dream-b-'+l.id);
 }else if(world==='ink-geometry'){
  V5.frame.plan.photo_mask='radial-ceiling';photoNode(g,cam,'dome',545,575,820,840,t,l.start-.15,-.025,90);
  lyricRow(g,cam,l.words.slice(0,3),1740,430,190,820,t,'geo-a-'+l.id);lyricRow(g,cam,l.words.slice(3),1740,690,175,820,t,'geo-b-'+l.id);
  layer('chorus/ceiling-contour',250,l.start+.4,2.2,['independent radial trace'],c=>withPlane(c,250,cam,q=>trace(q,ringPath(545,555,280,305),phase(t,l.start+.4,2.2),P.redLight,3)));
 }else{
  chorusPalace(g,cam,t,l.start-.12);
  lyricRow(g,cam,l.words.slice(0,2),1710,385,230,1220,t,'palace-a-'+l.id);lyricRow(g,cam,l.words.slice(2),1710,655,206,1400,t,'palace-b-'+l.id);
 }
 // The line is a musical path, not a prebuilt transition. Its endpoint follows its actual trim length.
 layer('chorus/thread-instrument',450,l.start+.1,2.0,['arc-length trace','audio-shaped curve'],c=>withPlane(c,60,cam,q=>{const p=[];for(let i=0;i<=120;i++){const u=i/120;p.push([130+1660*u,915+30*Math.sin(u*5.6)+Math.sin(Math.PI*u)*(10+22*e)*Math.sin(u*20-t*1.6)]);}trace(q,p,phase(t,l.start+.1,2.0)*(1-phase(t,LCFG.song_video_seconds-.9,.65)),P.redLight,5);}));
 // The author emerges during the instrumental coda, continuing into the next narration scene.
 if(t>LCFG.song_video_seconds-1.8)subjectRig(g,cam,'poet',550,610,1040,t-(LCFG.song_video_seconds-1.8),.05,{legend:false});
}
function creditsV5(g,cam,t){
 layer('credits/dark-flag',440,0,.4,['fixed contrast plane'],c=>{c.fillStyle='rgba(11,17,13,.76)';c.fillRect(0,0,W,H);});
 // Parent-linked ranges share the final line layout, not an entrance animation.
 const header=['المونتاج','والتصميم','بواسطة'],starts=[.12,.72,1.30],mc=document.createElement('canvas').getContext('2d');ctxFont(mc,66,650,'Alexandria');let widths=header.map(x=>mc.measureText(x).width),gap=30,total=widths.reduce((a,b)=>a+b,0)+gap*2,x=960+total/2;
 header.forEach((str,i)=>{label(g,cam,str,x,327,66,t,starts[i],{maxWidth:1600,duration:.78});x-=widths[i]+gap;});
 ctxFont(mc,240,400,'Amiri');const names=['شذى','ياسر'],nw=names.map(s=>mc.measureText(s).width),ng=mc.measureText(' ').width,tw=nw[0]+nw[1]+ng;let xx=960+tw/2;
 names.forEach((str,i)=>{label(g,cam,str,xx,604,240,t,1.74+i*.66,{family:'Amiri',weight:400,maxWidth:1450,duration:1.03});xx-=nw[i]+ng;});
 layer('credits/name-underline',550,2.8,1.55,['independent curved Trim Paths and moving cap'],c=>withPlane(c,80,cam,q=>trace(q,curve([1400,716],[1140,680],[780,750],[520,710]),phase(t,2.8,1.55),P.redLight,5)));
 label(g,cam,'موشح «جادك الغيث» · تسجيل «En al-Ándalus» لسامي يوسف',960,795,35,t,3.35,{align:'center',maxWidth:1700,duration:.78});
 layer('credits/source-lines',540,4.05,1.0,['three independent source-line masks'],c=>withPlane(c,55,cam,q=>{const entries=[['Images: Jebulon · Enrique · Miquel Rosselló Calafell',875,27],['Muqarnas: Sharon Mollerus · CC BY 2.0',924,27],['creativecommons.org/licenses/by/2.0 · Full credits in CREDITS.md',969,24]];entries.forEach(([str,y,size],i)=>{q.save();const p=phase(t,4.05+i*.18,.7);q.beginPath();q.rect(180,y-size-10,1560*p,size+25);q.clip();latin(q,str,960,y,size,P.ivory);q.restore();});}));
}
function v5Draw(fullT){
 const t=Math.round(clamp(fullT,0,LCFG.duration-1/32)*32)/32,g=document.getElementById('film').getContext('2d',{alpha:false});V5.queue=[];V5.layers=[];V5.serial=0;V5.inner=null;
 let s,src=t,age,cam,plan;
 if(t>=LCFG.credits_start){s={id:'C5',type:'credits-v5',focus:30};age=t-LCFG.credits_start;cam={x:0,y:0,dolly:keyValue(age,[[0,95],[3,106],[7,112]]),roll:0,focus:30};plan={roles:{},photo_mask:'angled-paper-reveal'};}
 else if(t>=LCFG.narration_cut_in&&t<LCFG.narration_resume_new){age=t-LCFG.narration_cut_in;const l=chorusLine(age);s={id:'M'+String(l.id+1).padStart(2,'0'),type:'chorus',focus:90};cam=chorusCamera(age);plan={roles:{},photo_mask:'angled-paper-reveal'};}
 else{src=t>=LCFG.narration_resume_new?t-LCFG.narration_tail_offset:t;s=sceneAt(src);age=src-s.from;cam=camera(src);plan=LCFG.plans[s.id];}
 if(sceneCacheId!==s.id){SURF.clear();V5.textCache.clear();for(const key of [...BLUR.keys()])if(key.startsWith('photo-'))BLUR.delete(key);sceneCacheId=s.id;}
 V5.frame={scene:s,age,sourceTime:src,newTime:t,camera:cam,plan};g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.filter='none';g.fillStyle=P.ink;g.fillRect(0,0,W,H);
 if(s.type==='chorus'){stage(g,cam,s,age);drawChorusV5(g,cam,age);}
 else if(s.type==='credits-v5'){stage(g,cam,s,age);creditsV5(g,cam,age);}
 else sceneContent(g,cam,s,src);
 flushLayers(g);optics(g,cam,t);
 if(s.type==='credits-v5'&&age>6.6){g.fillStyle=`rgba(7,12,9,${phase(age,6.6,.4,'inout')})`;g.fillRect(0,0,W,H);}
 return{frame:Math.round(t*32),time:t,scene:s.id,layers:V5.layers.length};
}
window.LayeredV5={inspect:()=>({scene:V5.frame?.scene,layers:V5.layers,camera:V5.frame?.camera}),ease:bezierEase,frameContract:'pure seek(t), 32fps',groupEntranceTransforms:false};

window.seek=v5Draw;
window.Cinematic={fps:FPS,width:W,height:H,camera,focusAt,spring,stopMotionFps:8,scenes};
window.filmReady=(async()=>{
 await Promise.all(Object.entries(window.CINEMATIC_ASSETS).map(([k,u])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{A[k]=im;resolve();};im.onerror=()=>reject(new Error('Asset failed: '+k));im.src=u;})));
 await document.fonts.ready;await document.fonts.load('700 64px Alexandria','الحمراء');await document.fonts.load('400 64px Amiri','قصيدة');
 v5Draw(0);document.documentElement.dataset.ready='true';return true;
})();
})();
