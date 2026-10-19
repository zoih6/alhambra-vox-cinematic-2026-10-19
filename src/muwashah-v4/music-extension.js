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
