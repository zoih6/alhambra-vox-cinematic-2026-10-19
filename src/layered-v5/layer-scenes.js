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
 const parts=[['bow',0,.29,.12,.62,'radial'],['shaft',.24,.9,.55,.88,'ltr'],['bit',.85,1,1.0,.5,'down']];
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
 object(g,cam,170,1410,797,t,.8,c=>{for(let k=0;k<2;k++){const p=[];for(let i=0;i<=96;i++){let a=i*Math.PI*2/96;p.push([Math.cos(a)*(275-k*33),Math.sin(a)*(84-k*22)]);}trace(c,p,phase(t,1+k*.33,1.25),P.paper,k?2:7);}drawTypeMatte(c,'شعرٌ على حافة الحوض',0,20,43,P.paper,t-2.25,.8,{align:'center',maxWidth:500});},{});redThread(g,cam,t);}
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
  layer('chorus/'+id+'/word-'+i+'/body-dots',133,w.start,dur,['native connected Arabic body, ascender, descender and dot masks'],c=>{if(age<0)return;withPlane(c,133,cam,q=>{let out=1;if(t>LCFG.song_video_seconds-1.0)out=1-phase(t,LCFG.song_video_seconds-1.0+i*.04,.55);q.save();q.translate(xx-ww/2,baseline);maskShape(q,ww+50,size*2,out,'angled');q.translate(-xx+ww/2,-baseline);drawTypeMatte(q,w.text,xx,baseline,size,active?P.redLight:P.ivory,age,dur,{family:'Amiri',weight:400,fast:true});q.restore();});});
  layer('chorus/'+id+'/word-'+i+'/underline',450,w.start+.10,Math.max(.24,w.end-w.start),['separate Trim Paths; reacts to measured beat without moving the word'],c=>{if(t<w.start||t>w.end+.65)return;withPlane(c,133,cam,q=>{const y=baseline+size*.25+chorusPulse(t)*2;trace(q,[[xx-ww+5,y],[xx-4,y]],phase(t,w.start+.1,Math.max(.24,(w.end-w.start)*.65))*(1-phase(t,w.end+.2,.4)),P.redLight,2.8);});});
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
