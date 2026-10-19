/*
 * ALHAMBRA / A POEM IN STONE — deterministic layered motion study.
 * Each shot owns a pure drawing function of absolute time.
 * No animation loop, timers, CSS animation, random simulation, or video export.
 * Assets are injected as data URLs by tools/build_preview.py.
 */
(() => {
'use strict';
const W=1920,H=1080,FPS=32;
const C={ink:'#202420',paper:'#e7dec9',light:'#f3eddf',red:'#ad3c2c',bright:'#d8573d',muted:'#9d9a88',sea:'#849497'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
function spring(t,k=170,d=26){
  if(t<=0)return 0;
  const q=d*d-4*k;
  if(Math.abs(q)<1e-6){const w=Math.sqrt(k);return 1-Math.exp(-w*t)*(1+w*t);}
  if(q<0){const w=Math.sqrt(k-d*d/4);return 1-Math.exp(-d*t/2)*(Math.cos(w*t)+d/(2*w)*Math.sin(w*t));}
  const r1=(-d+Math.sqrt(q))/2,r2=(-d-Math.sqrt(q))/2;
  return 1-(r2*Math.exp(r1*t)-r1*Math.exp(r2*t))/(r2-r1);
}
const PRESET={SNAPPY:[320,30],DEFAULT:[170,26],HEAVY:[90,20],PLAYFUL:[220,18]};
const S=(t,start=0,p='DEFAULT')=>spring(t-start,...PRESET[p]);
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const I={};
function font(g,size,weight=650,family='Alexandria'){g.font=`${weight} ${size}px "${family}"`;g.direction='rtl';g.textBaseline='alphabetic';}
function text(g,str,x,y,size,color=C.light,opts={}){
  g.save();font(g,size,opts.weight??650,opts.family??'Alexandria');
  if(opts.maxWidth){while(g.measureText(str).width>opts.maxWidth&&size>18){size-=1;font(g,size,opts.weight??650,opts.family??'Alexandria');}}
  g.textAlign=opts.align??'right';g.fillStyle=color;
  if(opts.stroke){g.strokeStyle=opts.stroke;g.lineWidth=opts.lineWidth??2;g.strokeText(str,x,y);}else g.fillText(str,x,y);
  g.restore();
}
function line(g,points,color=C.red,width=6,p=1,dash=[]){
  if(p<=0||points.length<2)return;
  let total=0,lens=[];for(let n=1;n<points.length;n++){const l=Math.hypot(points[n][0]-points[n-1][0],points[n][1]-points[n-1][1]);lens.push(l);total+=l;}
  let remain=clamp(p)*total;g.save();g.beginPath();g.moveTo(...points[0]);
  for(let n=1;n<points.length;n++){const l=lens[n-1];if(remain>=l){g.lineTo(...points[n]);remain-=l;}else{g.lineTo(lerp(points[n-1][0],points[n][0],remain/l),lerp(points[n-1][1],points[n][1],remain/l));break;}}
  g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.setLineDash(dash);g.stroke();g.restore();
}
function curvePoints(a,b,c,d,n=80){let p=[];for(let i=0;i<=n;i++){let t=i/n,u=1-t;p.push([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]]);}return p;}
function thread(g,a,b,c,d,p=1,width=7,color=C.red){line(g,curvePoints(a,b,c,d),color,width,p);}
function disc(g,x,y,r,color){g.beginPath();g.arc(x,y,Math.max(0,r),0,Math.PI*2);g.fillStyle=color;g.fill();}
function tornPath(g,w,h,seed=1,rough=7){
  let r=rng(seed);g.beginPath();g.moveTo(-w/2,-h/2);
  const nx=Math.ceil(w/37),ny=Math.ceil(h/37);
  for(let i=1;i<=nx;i++)g.lineTo(-w/2+w*i/nx,-h/2+(r()-.5)*rough*2);
  for(let i=1;i<=ny;i++)g.lineTo(w/2+(r()-.5)*rough*2,-h/2+h*i/ny);
  for(let i=1;i<=nx;i++)g.lineTo(w/2-w*i/nx,h/2+(r()-.5)*rough*2);
  for(let i=1;i<=ny;i++)g.lineTo(-w/2+(r()-.5)*rough*2,h/2-h*i/ny);g.closePath();
}
function textureFill(g,key,x,y,w,h){const img=I[key];if(img)g.drawImage(img,x,y,w,h);}
function paper(g,x,y,w,h,type='paper',rot=0,seed=4,shadow=true){
  if(w<=0||h<=0)return;g.save();g.translate(x,y);g.rotate(rot*Math.PI/180);tornPath(g,w,h,seed);
  if(shadow){g.shadowColor='rgba(0,0,0,.28)';g.shadowBlur=23;g.shadowOffsetX=4;g.shadowOffsetY=14;}
  g.fillStyle=type==='red'?C.red:type==='charcoal'?C.ink:C.paper;g.fill();g.shadowColor='transparent';g.clip();textureFill(g,type,-w/2,-h/2,w,h);g.restore();
}
function cover(g,img,x,y,w,h,fy=.5){const r=Math.max(w/img.width,h/img.height),sw=w/r,sh=h/r,sx=(img.width-sw)/2,sy=(img.height-sh)*fy;g.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
function photo(g,key,x,y,w,h,rot=0,seed=4,filter='',fy=.5){
  if(w<=0||h<=0)return;g.save();g.translate(x,y);g.rotate(rot*Math.PI/180);tornPath(g,w,h,seed,8);g.shadowColor='rgba(0,0,0,.32)';g.shadowBlur=28;g.shadowOffsetY=16;g.fillStyle=C.paper;g.fill();g.shadowColor='transparent';g.clip();g.filter=filter;cover(g,I[key],-w/2,-h/2,w,h,fy);g.restore();
}
function cut(g,key,x,y,w,rot=0,shadow=true){const img=I[key],h=w/img.width*img.height;if(w<=0)return;g.save();g.translate(x,y);g.rotate(rot*Math.PI/180);if(shadow){g.shadowColor='rgba(0,0,0,.42)';g.shadowBlur=28;g.shadowOffsetY=20;}g.drawImage(img,-w/2,-h/2,w,h);g.restore();}
function background(g,key='charcoal'){g.fillStyle=key==='paper'?C.paper:C.ink;g.fillRect(0,0,W,H);textureFill(g,key,0,0,W,H);}
function arch(g,x,y,w,h,color,weight=3){
  g.save();g.translate(x,y);g.strokeStyle=color;g.lineWidth=weight;g.beginPath();g.moveTo(-w/2,h/2);g.lineTo(-w/2,0);g.bezierCurveTo(-w*.65,-h*.28,-w*.33,-h*.52,0,-h*.55);g.bezierCurveTo(w*.33,-h*.52,w*.65,-h*.28,w/2,0);g.lineTo(w/2,h/2);g.stroke();g.restore();
}
function star(g,x,y,r,color,rot=0){g.save();g.translate(x,y);g.rotate(rot);g.beginPath();for(let i=0;i<16;i++){let a=i*Math.PI/8,rr=i%2?r*.71:r;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.strokeStyle=color;g.lineWidth=2;g.stroke();g.restore();}
function tag(g,str,x,y,w=330,rot=0,color='charcoal',size=42){paper(g,x,y,w,82,color,rot,42,false);g.save();g.translate(x,y);g.rotate(rot*Math.PI/180);text(g,str,0,15,size,color==='paper'?C.ink:C.light,{align:'center',maxWidth:w-35});g.restore();}
function topo(g,cx,cy,s=1,color='rgba(235,222,195,.15)'){
  g.save();g.translate(cx,cy);g.scale(s,s);g.strokeStyle=color;g.lineWidth=2;
  for(let n=0;n<14;n++){g.beginPath();for(let i=0;i<=100;i++){let a=i*Math.PI*2/100,rad=80+n*33+Math.sin(a*3+.5)*19+Math.cos(a*5)*12,x=Math.cos(a)*rad*1.4,y=Math.sin(a)*rad*.56;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}g.restore();
}
// Shot 01: the question has physical weight; relief is a disclosed generated metaphor.
function shotStone(g,t){
  background(g);topo(g,600,570,1.12,'rgba(231,222,201,.08)');
  const a=S(t,.04,'HEAVY'),b=S(t,.58,'SNAPPY');
  paper(g,576,584+160*(1-a),800,698,'red',-10,123,true);
  paper(g,612,548+110*(1-a),784,662,'paper',-2,123,true);
  cut(g,'stone',619-115*(1-a),544+38*(1-a),872*(.88+.12*a),-7+4*(1-a));
  text(g,'هل يمكن',1742,244-55*(1-b),54,C.paper,{maxWidth:610});
  g.save();g.translate(0,50*(1-S(t,.86,'HEAVY')));text(g,'لحجر',1742,489,252,C.light,{family:'Amiri',weight:400,maxWidth:635});g.restore();
  text(g,'أن يحفظ الشعر؟',1740+100*(1-S(t,1.7,'SNAPPY')),678,76,C.light,{maxWidth:730});
  thread(g,[658,855],[1006,1150],[1074,703],[1680,770],ease((t-1.1)/1.05),8,C.bright);
  thread(g,[1633,794],[1698,792],[1710,778],[1736,757],ease((t-2.1)/.4),5,C.bright);
  disc(g,690,862,8,C.bright);
  g.save();g.globalAlpha=.26;star(g,1810,1000,102,C.paper,.14);g.restore();
}
// Shot 02: genuine epigraphy is revealed under a moving inspection lens.
function shotWalls(g,t){
  background(g,'paper');
  paper(g,555,530,800,947,'red',-7,212);paper(g,584,532,750,920,'charcoal',-3,19);
  photo(g,'inscription',570-130*(1-S(t,.0,'HEAVY')),534,704,880,-5,19,'saturate(.52) contrast(1.07)');
  text(g,'جدران',1758,279,151,C.ink,{family:'Amiri',weight:400,maxWidth:760});
  text(g,'تروي التاريخ.',1755,432,85,C.ink,{maxWidth:750});
  const p=S(t,.75,'DEFAULT'),cx=1430+160*(1-p),cy=720,r=200;
  thread(g,[710,570],[1030,507],[1014,762],[cx-r+6,cy],ease((t-.45)/.85),7);
  g.save();g.shadowColor='rgba(33,31,24,.27)';g.shadowBlur=22;g.shadowOffsetY=15;disc(g,cx,cy,r+13,C.light);g.restore();
  g.save();g.beginPath();g.arc(cx,cy,r,0,2*Math.PI);g.clip();g.filter='saturate(.6)';const im=I.inscription;g.drawImage(im,im.width*.20,im.height*.22,im.width*.52,im.height*.52,cx-r,cy-r,r*2,r*2);g.restore();
  g.save();g.strokeStyle=C.red;g.lineWidth=5;g.beginPath();g.arc(cx,cy,r+13,0,Math.PI*2);g.stroke();g.restore();
  line(g,[[cx+145,cy+155],[cx+235,cy+253]],C.ink,24,S(t,1.05,'SNAPPY'));
  tag(g,'نقشٌ من الحمراء',1390,1005,430,-2,'charcoal',39);
}
// Shot 03: eight tactile strata form an intelligible temporal diagram.
function shotCenturies(g,t){
  background(g);topo(g,420,550,1.3,'rgba(235,222,195,.065)');
  for(let i=0;i<8;i++){
    let p=S(t,i*.095,'HEAVY'),x=414+i*31,y=905-i*92+170*(1-p),w=600-i*14;
    paper(g,x,y,w,110,i===7?'red':'paper',-9+i*.65,600+i,true);
    if(i<7){g.save();g.globalAlpha=.38;line(g,[[x-w*.38,y-13],[x+w*.38,y-35]],C.ink,2);line(g,[[x-w*.38,y+9],[x+w*.24,y-9]],C.ink,2);g.restore();}
  }
  text(g,'نحو',1664,265,62,C.paper,{maxWidth:280});
  text(g,'٨',1403,789,628,C.light,{weight:700,maxWidth:620});
  text(g,'قرون',1780,798,165,C.light,{family:'Amiri',weight:400,maxWidth:470});
  line(g,[[928,873],[1770,873]],C.bright,8,ease((t-.4)/1.05));
  for(let i=0;i<8;i++){const x=955+i*111;line(g,[[x,861],[x,899]],C.bright,4,S(t,.45+i*.06,'SNAPPY'));}
  text(g,'والحجر ما زال يتكلّم.',1735,1005,49,C.paper,{maxWidth:860});
}
function geographic(g,x,y,w,h,t){
  const minLon=-11,maxLon=5,minLat=34,maxLat=45;
  const project=(p)=>[x+(p[0]-minLon)/(maxLon-minLon)*w,y+(maxLat-p[1])/(maxLat-minLat)*h];
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.fillStyle='#adb5ad';g.fillRect(x,y,w,h);
  for(let i=0;i<13;i++)line(g,[[x,y+i*h/12],[x+w,y+i*h/12]],'rgba(36,53,52,.12)',1);
  for(let i=0;i<15;i++)line(g,[[x+i*w/14,y],[x+i*w/14,y+h]],'rgba(36,53,52,.12)',1);
  for(const f of window.FILM_MAP.features){
    const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const poly of polys){g.beginPath();for(const ring of poly){ring.forEach((p,i)=>{const q=project(p);if(!i)g.moveTo(...q);else g.lineTo(...q);});g.closePath();}
      g.fillStyle=f.properties.name==='Spain'?'#ded3b8':f.properties.name==='Portugal'?'#c5c0ae':'#c0bba8';g.fill();g.strokeStyle='#5f6961';g.lineWidth=2.2;g.stroke();}
  }
  const pt=project([-3.5881,37.1761]);
  const sc=S(t,.45,'PLAYFUL');disc(g,...pt,16*sc,C.red);g.strokeStyle=C.red;g.lineWidth=4;g.beginPath();g.arc(...pt,34*sc,0,Math.PI*2);g.stroke();
  text(g,'الأندلس',pt[0]+260,pt[1]-52,57,C.ink,{maxWidth:330});
  g.restore();return pt;
}
// Shot 04: an actual country outline and coordinate, then an illustrative elevation layer.
function shotMap(g,t){
  background(g,'paper');paper(g,603,582,1300,1020,'charcoal',-5,61,true);
  g.save();g.translate(603,555+100*(1-S(t,0,'HEAVY')));g.rotate(-5*Math.PI/180);tornPath(g,1170,875,71,11);g.clip();
  const point=geographic(g,-585,-437,1170,875,t);g.restore();
  // The physical map is tilted: transform the geographic point into film coordinates.
  const local=[-585+(-3.5881+11)/16*1170,-437+(45-37.1761)/11*875];const a=-5*Math.PI/180;
  const px=603+local[0]*Math.cos(a)-local[1]*Math.sin(a),py=555+local[0]*Math.sin(a)+local[1]*Math.cos(a);
  text(g,'هنا.',1770,316,234,C.ink,{family:'Amiri',weight:400,maxWidth:600});
  text(g,'هضبة السبيكة',1774,472,67,C.ink,{maxWidth:685});
  text(g,'غرناطة · الأندلس',1768,557,39,'#676b61',{maxWidth:650});
  thread(g,[px+25,py+10],[1060,924],[1070,587],[1454,660],ease((t-.45)/1.0),7);
  for(let i=0;i<4;i++)paper(g,1515,906-i*42+70*(1-S(t,.72+i*.06,'HEAVY')),550-i*20,126,'paper',-4,80+i,true);
  cut(g,'palace',1504,772+75*(1-S(t,1.04,'HEAVY')),675,0,true);
  disc(g,1460,657,9,C.red);
}
// Shot 05: a photo is a spatial layer, not a pre-composed frame transition.
function shotSky(g,t){
  background(g);g.fillStyle='rgba(35,59,62,.34)';g.fillRect(0,0,W,H);
  topo(g,1560,630,1.45,'rgba(231,222,201,.09)');
  paper(g,810,755,1680,670,'paper',-5,78,true);
  const p=S(t,.0,'HEAVY');photo(g,'dawn',928,728+120*(1-p),1818,678,-1.7,180,'saturate(.64) contrast(1.05)',.8);
  text(g,'تعانق',1006,241,159,C.light,{family:'Amiri',weight:400,maxWidth:700});
  text(g,'السماء',1790,421,246,C.light,{family:'Amiri',weight:400,maxWidth:765});
  thread(g,[120,477],[675,304],[1013,602],[1674,477],ease((t-.7)/1.35),7,C.bright);
  line(g,[[1674,477],[1648,438]],C.bright,7,S(t,1.72,'SNAPPY'));line(g,[[1674,477],[1625,475]],C.bright,7,S(t,1.72,'SNAPPY'));
  tag(g,'غرناطة',341,922,272,-3,'paper',54);
}
function slab(g,x,y,w,h,color,t,seed){
  paper(g,x,y+80*(1-t),w,h,color,-6,seed,true);
  g.save();g.translate(x,y+80*(1-t));g.rotate(-6*Math.PI/180);g.strokeStyle='rgba(33,36,32,.35)';g.lineWidth=3;
  g.strokeRect(-w*.38,-h*.20,w*.76,h*.4);
  for(let i=0;i<7;i++)g.strokeRect(-w*.34+i*w*.105,-h*.16,w*.08,h*.32);
  g.restore();
}
// Shot 06: the landmark is unpacked as structural layers; labels are editorial, not a plan survey.
function shotPalace(g,t){
  background(g,'paper');
  text(g,'ليس مجرّد',1790,269,102,C.ink,{maxWidth:700});
  text(g,'قصر',1770,594,320,C.ink,{family:'Amiri',weight:400,maxWidth:485});
  g.save();g.globalAlpha=.12;topo(g,677,600,1.35,'#535f50');g.restore();
  slab(g,655,931,1130,180,'red',S(t,.0,'HEAVY'),128);
  slab(g,669,826,1130,190,'paper',S(t,.15,'HEAVY'),125);
  slab(g,683,721,1130,190,'paper',S(t,.3,'HEAVY'),126);
  cut(g,'palace',650,524+100*(1-S(t,.38,'HEAVY')),1160,-2,true);
  thread(g,[1734,662],[1490,554],[1550,899],[1200,930],ease((t-.5)/1.15),8);
  tag(g,'حجر',292,962,180,-5,'charcoal',45);
  tag(g,'هندسة',655,977,244,-5,'charcoal',45);
  tag(g,'حكاية',1045,939,244,-5,'charcoal',45);
}
// Shot 07: complete Arabic words are masked as units; glyph shaping remains intact.
function shotPoem(g,t){
  background(g);g.save();g.globalAlpha=.15;photo(g,'inscription',1460,540,1050,1160,5,18,'grayscale(1)');g.restore();
  paper(g,900,565,1535,755,'red',-6,84,true);
  paper(g,951,534+80*(1-S(t,0,'HEAVY')),1605,742,'paper',-3,77,true);
  g.save();g.translate(951,534);g.rotate(-3*Math.PI/180);
  for(let i=0;i<5;i++)arch(g,-530+i*255,90,220,460,'rgba(59,60,48,.12)',3);
  g.restore();
  text(g,'بل كُتب ليكون',1590,310,68,C.ink,{maxWidth:890});
  g.save();g.beginPath();g.rect(125,340,1710*clamp(S(t,.15,'HEAVY')),530);g.clip();
  text(g,'قصيدة',1624,786,440,C.ink,{family:'Amiri',weight:400,maxWidth:1380});g.restore();
  thread(g,[322,835],[790,775],[1280,1042],[1684,809],ease((t-.42)/1.15),9,C.red);
  g.save();g.globalAlpha=.68;star(g,320,280,71,C.red,.16);g.restore();
}
// Shot 08: opening title, leaving room to continue the narration beyond second 30.
function shotTitle(g,t){
  background(g);topo(g,960,780,1.7,'rgba(231,222,201,.085)');
  paper(g,620,1060,1500,450,'paper',-6,68,true);
  paper(g,1574,997,820,450,'red',5,73,true);
  g.save();g.globalAlpha=.17;for(let i=0;i<5;i++)arch(g,250+i*355,748,280,560,C.paper,2);g.restore();
  const p=S(t,.0,'HEAVY');text(g,'الحمراء',1670,402+75*(1-p),316,C.light,{family:'Amiri',weight:400,maxWidth:1475});
  thread(g,[444,464],[898,410],[1247,541],[1730,465],ease((t-.2)/.9),9,C.bright);
  text(g,'قصيدة من حجر',1653,572,68,C.paper,{maxWidth:900});
  cut(g,'palace',964,932+115*(1-S(t,.35,'HEAVY')),1700,-1,true);
  // Small late reveal belongs to the central composition, not a corner title.
  if(t>1.75)tag(g,'غرناطة',1385,974,268,-2,'charcoal',51);
}
const SHOTS=[
 {id:'01',from:0,to:126,still:86,title:'هل يحفظ الحجر الشعر؟',voice:'هل يمكن لحجر أن يحفظ الشعر؟',motion:'هبوط حجرٍ بوزن، ثم خطّ أحمر يخرج من النقش ويلتقط السؤال.',draw:shotStone},
 {id:'02',from:126,to:250,still:207,title:'الجدار يتحوّل إلى وثيقة',voice:'وهل يمكن لجدران أن تروي تاريخاً…',motion:'طبقات الجدار تتباعد؛ عدسة متجهية تتبع نقشًا حقيقيًا.',draw:shotWalls},
 {id:'03',from:250,to:343,still:307,title:'الزمن يُرى في ثماني طبقات',voice:'عمره ثمانية قرون؟',motion:'ثماني شرائح ورقية تتراكم بنوابض ثقيلة؛ الخطّ يصبح محور زمن.',draw:shotCenturies},
 {id:'04',from:343,to:453,still:430,title:'من الأندلس إلى السبيكة',voice:'هنا فوق هضبة السبيكة…',motion:'خريطة جغرافية حقيقية، نقطة غرناطة، ثم ارتفاع مجسّم ورقي للهضبة.',draw:shotMap},
 {id:'05',from:453,to:574,still:535,title:'مدينة تعانق السماء',voice:'حيث تعانق السماء مدينة غرناطة…',motion:'تتباعد طبقات الورق والصورة؛ يمتدّ خطّ السماء فوق الأفق.',draw:shotSky},
 {id:'06',from:574,to:720,still:672,title:'أكثر من مجرد قصر',voice:'يقف قصر لم يُبنَ ليكون مجرد قصر…',motion:'تفكيك تركيبي للحجر والهندسة والحكاية، لا انتقال بين صورتين.',draw:shotPalace},
 {id:'07',from:720,to:835,still:800,title:'حين تصبح العمارة شعرًا',voice:'بل كُتب ليكون قصيدة.',motion:'الكلمة تُكشف كتلةً متصلة فوق أقواس؛ الخطّ الأحمر يصبح بيت شعر.',draw:shotPoem},
 {id:'08',from:835,to:960,still:922,title:'عنوان الفيلم من قلب الحكاية',voice:'إنه قصر الحمراء، آخر شاهد…',motion:'صورة القصر الحقيقية تستقرّ تحت عنوانٍ كبير؛ تمهيد لبداية التاريخ.',draw:shotTitle}
];
function frameInfo(t){const frame=Math.max(0,Math.min(959,Math.round(t*FPS)));const shot=SHOTS.find(s=>frame>=s.from&&frame<s.to)||SHOTS[7];return{frame,time:frame/FPS,shot,local:(frame-shot.from)/FPS};}
function drawInto(ctx,t){
  const f=frameInfo(t);ctx.save();ctx.setTransform(ctx.canvas.width/W,0,0,ctx.canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.direction='rtl';
  const index=SHOTS.indexOf(f.shot),transition=.375;
  if(index>0&&f.local<transition){
    const prev=SHOTS[index-1];prev.draw(ctx,(prev.to-prev.from)/FPS+f.local);
    const p=ease(f.local/transition),edge=W*(1-p),r=rng(510+index);
    ctx.save();ctx.beginPath();ctx.moveTo(W+40,-40);ctx.lineTo(edge,-40);
    for(let y=0;y<=H+40;y+=35)ctx.lineTo(edge+(r()-.5)*17,y);
    ctx.lineTo(W+40,H+40);ctx.closePath();ctx.clip();f.shot.draw(ctx,f.local);ctx.restore();
    if(p>0&&p<1){line(ctx,[[edge-2,0],[edge-2,H]],'rgba(230,218,194,.7)',3);}
  }else f.shot.draw(ctx,f.local);
  ctx.restore();return{frame:f.frame,shot:f.shot.id,time:f.time};
}
window.FILM={width:W,height:H,fps:FPS,duration:30,shots:SHOTS.map(({draw,...s})=>s),drawInto,spring,presets:PRESET};
window.seek=t=>drawInto(document.getElementById('film').getContext('2d'),t);
window.filmReady=(async()=>{
  await Promise.all(Object.entries(window.FILM_ASSETS).map(([key,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{I[key]=im;resolve();};im.onerror=()=>reject(new Error('Asset unavailable: '+key));im.src=url;})));
  await document.fonts.ready;await document.fonts.load('700 64px Alexandria','الحمراء');await document.fonts.load('400 64px Amiri','قصيدة');
  for(const shot of SHOTS){const c=document.getElementById('frame-'+shot.id);if(c)drawInto(c.getContext('2d'),shot.still/FPS);}
  window.seek(SHOTS[0].still/FPS);document.documentElement.dataset.ready='true';return true;
})();
})();
