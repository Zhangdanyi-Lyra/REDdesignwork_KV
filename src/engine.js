'use strict';
const W=768,H=1152;
const DEFAULTS={wordSize:30,fallSpeed:180,wordGravity:720,spawnInterval:.32,duration:5,catchWidth:358,launchSpeed:940,spread:105,direction:0,spin:165,burstGravity:0,drag:.45,stagger:.055,flightTime:3.2,spriteScale:1.5,spriteScaleRevision:2,restitution:.82,iconLimit:10,collision:true,walls:true,autoLayout:false,showGuides:false,showColliders:false,showLabels:false,trajectory:'fan'};
const CATALOG=[
 {id:'pairloops',label:'双人举环',category:'person',asset:'burst:person_1dc461b2a153d286d1a22d7e45d6374f'},
 {id:'hang',label:'倒挂的人',category:'person',asset:'burst:person_481036e7479e60700532a3676afbe67b'},
 {id:'archpair',label:'搭桥的人',category:'person',asset:'burst:person_4859fba440b0df714463f6ffb6f77a77'},
 {id:'flat',label:'躺平的人',category:'person',asset:'burst:person_55e75a2dbc4041546a44a18f15d28aa3'},
 {id:'walkpair',label:'并肩走的人',category:'person',asset:'burst:person_5d6184348134fee536752e92f1c71ae8'},
 {id:'crawlpair',label:'爬行的人',category:'person',asset:'burst:person_7aeecea3b5abd1925283c2797aee2b21'},
 {id:'jumpgroup',label:'一起跳的人',category:'person',asset:'burst:person_8429865d05b18f681dc4709a36f24eba'},
 {id:'curl',label:'蜷缩的人',category:'person',asset:'burst:person_89bff9194cad9bc4d7c90af150629086'},
 {id:'turnbody',label:'转身的人',category:'person',asset:'burst:person_8db787f94058ccd91a6559fa8170c0da'},
 {id:'floatbody',label:'漂浮的人',category:'person',asset:'burst:person_b362262439554b807764faeba11dbdf0'},
 {id:'kneesup',label:'仰躺的人',category:'person',asset:'burst:person_bd860e9869a9881b14d73a69dface038'},
 {id:'sidelying',label:'侧躺的人',category:'person',asset:'burst:person_e46672969389def9f8387ae192495c2b'},
 {id:'lean',label:'探身的人',category:'person',asset:'burst:person_e7045716928ab20c245e5adc5177d115'},
 {id:'inverted',label:'倒立的人',category:'person',asset:'burst:person_eab256713dc8aba28b87d6513da2c1e4'},
 {id:'bend',label:'下腰的人',category:'person',asset:'burst:person_f0afce055742db27184e4ddd85723e3e'},
 ...SCENE_CATALOG
];
const ENGLISH={pairloops:'Together',hang:'Hanging',archpair:'Bridge',flat:'Lie Flat',walkpair:'Walking',crawlpair:'Crawling',jumpgroup:'Jump',curl:'Curl',turnbody:'Turn',floatbody:'Float',kneesup:'Rest',sidelying:'Recline',lean:'Lean',inverted:'Handstand',bend:'Backbend',stool:'Stool',cat:'Cat',creature:'Creature',chair:'Chair',seesaw:'Seesaw',bottle:'Bottle',skateboard:'Skateboard',mug:'Coffee',cone:'Cone',springhorse:'Ride',drink:'Drink',lineanimal:'Animal',bollard:'Bollard'};
const SYMBOLS={jumpgroup:'↑',turnbody:'↻',skateboard:'→',cone:'!',drink:'%',bollard:'●'};
const WORD_FONTS={sans:'600 SIZEpx "Poster PingFang","PingFang SC","Microsoft YaHei",sans-serif',serif:'900 SIZEpx "Poster Source Han","Source Han Serif SC","Source Han Serif CN","Songti SC",serif',latin:'900 SIZEpx "Poster DIN","DIN Next LT Pro","Arial Narrow",sans-serif'};
function wordFont(kind,size){return WORD_FONTS[kind||'sans'].replace('SIZE',size)}
const ORIGINAL_ORDER=[];
const PALETTE={person:'#e9f1ff',object:'#fff1e5',place:'#edf4d5'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
class UrbanEngine{
 constructor(images,config={},seed=Date.now()){
  this.images=images;this.cfg={...DEFAULTS,...config};this.catalog=CATALOG.map(a=>({...a}));this.seed=seed>>>0;this.time=0;this.state='original';this.paused=false;this.words=[];this.fallen=[];this.expanded=false;this.bag=[];this.history=[];this.chips=[];this.effects=[];this.bodies=[];this.groups=[];this.cx=383.15;this.targetX=this.cx;this.bracketY=968.3;this.bagPulse=0;this.elapsed=0;this.burstElapsed=0;this.spawnClock=0;this.collisions=0;this.previewBurst=false;this.titleRevealAt=Infinity;this.lastGroupKey='';this.onChange=()=>{};this.onCatch=()=>{};this.onToast=()=>{};this.keys={left:false,right:false};this.serial=0;this.measureText=(text,font,size)=>Array.from(text).reduce((n,c)=>n+(c.charCodeAt(0)>255?size:size*.6),0);
 }
 random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296}
 range(a,b){return a+(b-a)*this.random()}
 shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 counts(list=this.bag){const c={person:0,object:0,place:0};for(const a of list)if(a.category in c)c[a.category]+=a.count||1;return c}
 possible(list=this.bag){return Math.min(this.cfg.iconLimit,10,list.length+(list.length&&!list.some(a=>a.category==='person')?1:0))}
 totalCaught(){return this.bag.reduce((n,a)=>n+(a.count||1),0)}
 active(){return ['playing','supplement','burst','settling','free'].includes(this.state)}
 canGenerate(){return this.bag.length>0}
 setConfig(k,v){const old=this.cfg[k];this.cfg[k]=v;if(k==='fallSpeed'){for(const w of this.words)w.vy+=v-old}if(k==='spin'){for(const b of this.bodies)b.omega=b.spinSign*v*Math.PI/180}if(k==='catchWidth')this.moveCatch(this.targetX);if(k==='spriteScale'&&this.cfg.walls)for(const b of this.bodies)this.wallCollision(b);this.onChange()}
 moveCatch(x){const half=this.cfg.catchWidth/2;this.targetX=clamp(x,half+12,W-half-12)}
 start(){this.state='playing';this.paused=false;this.elapsed=0;this.words=[];this.fallen=[];this.expanded=false;this.bag=[];this.history=[];this.chips=[];this.effects=[];this.groups=[];this.bodies=[];this.spawnClock=0;this.burstElapsed=0;this.previewBurst=false;this.titleRevealAt=Infinity;this.collisions=0;this.onChange()}
 original(){this.state='original';this.paused=false;this.words=[];this.fallen=[];this.expanded=false;this.bodies=[];this.effects=[];this.groups=[];this.bag=[];this.history=[];this.chips=[];this.cx=this.targetX=383.15;this.cfg.catchWidth=DEFAULTS.catchWidth;this.previewBurst=false;this.titleRevealAt=Infinity;this.onChange()}
 supplement(){this.state='supplement';this.paused=false;this.words=[];this.spawnClock=0;this.onChange()}
 finish(){for(const w of this.words)this.dropWord(w);this.words=[];this.state=this.canGenerate()?'review':'needs';if(this.state==='review')this.targetX=383.15;this.keys.left=this.keys.right=false;this.onChange()}
 posterAction(){return this.state==='original'?{kind:'start',x:390,y:1016,w:92,h:70}:this.state==='review'?{kind:'generate',x:this.cx+2.85,y:1014,w:70,h:92}:['result','free'].includes(this.state)&&!this.expanded?{kind:'expand',x:this.cx+2.85,y:1014,w:70,h:92}:null}
 wordSize(w){const size=w.size||this.cfg.wordSize,text=w.text||w.item.label,font=wordFont(w.fontKind,size),width=Math.min(W-24,this.measureText(text,font,size)+size*.2),height=size*34/30;w.w=width;w.h=height;const c=Math.abs(Math.cos(w.angle||0)),s=Math.abs(Math.sin(w.angle||0));w.hx=(width*c+height*s)/2;w.hy=(height*c+width*s)/2;return w}
 dropWord(w){this.fallen.push(this.wordSize({...w,size:w.size||this.cfg.wordSize,resting:false}))}
 stepFallen(dt){
  // Words retain their type size; conservative rotated boxes prevent overlaps.
  const active=this.fallen.filter(w=>!w.resting);
  for(const w of active){
   const prevBottom=w.y+w.hy;
   w.vy+=this.cfg.wordGravity*dt;w.x=clamp(w.x+w.vx*dt,w.hx+6,W-w.hx-6);w.y+=w.vy*dt;
   let surface=1128;
   for(const other of this.fallen){if(other===w||!other.resting)continue;const top=other.y-other.hy;
    if(Math.abs(w.x-other.x)<w.hx+other.hx+2&&(prevBottom<=top+3||(w.y-w.hy<other.y+other.hy&&w.y+w.hy>top)))surface=Math.min(surface,top-2);
   }
   if(w.y+w.hy>=surface&&w.vy>=0){w.y=surface-w.hy;w.vy=0;w.vx=0;w.resting=true}
  }
 }
 undo(){if(!['review','needs'].includes(this.state)||!this.history.length)return;const id=this.history.pop(),a=this.bag.find(a=>a.id===id);a.count--;if(!a.count){this.bag=this.bag.filter(a=>a.id!==id);this.chips=this.chips.filter(c=>c.item.id!==id)}this.state=this.canGenerate()?'review':'needs';this.onChange()}
 togglePause(){if(this.active()){this.paused=!this.paused;this.onChange()}}
 chooseWord(){return this.catalog[Math.floor(this.random()*this.catalog.length)]}
 spawn(){const item=this.chooseWord(),r=this.random(),text=r<.64?item.label:r<.91?item.english||ENGLISH[item.id]||item.label:SYMBOLS[item.id]||item.english||ENGLISH[item.id]||item.label,fontKind=/[\u3400-\u9fff]/.test(text)?(this.random()<.5?'sans':'serif'):'latin';const w=this.wordSize({item,text,fontKind,x:384,y:280,vy:this.cfg.fallSpeed,vx:this.range(-19,19),angle:this.range(-.36,.36),birth:this.time,id:++this.serial});w.x=this.range(w.hx+12,W-w.hx-12);w.sourceX=w.x;this.words.push(w)}
 catchWord(w){
  const existing=this.bag.find(a=>a.id===w.item.id);this.bagPulse=1;this.history.push(w.item.id);this.onCatch();
  if(existing)existing.count++;else{const item={...w.item,count:1};this.bag.push(item);this.chips.push({item,text:w.text||w.item.label,fontKind:w.fontKind||'sans',x:clamp(w.x-this.cx,-95,95),y:10,vx:0,vy:70,angle:w.angle})}
  this.onChange();if(this.state==='supplement')this.finish();
 }
 selectIcons(pool){
  const hasPerson=pool.some(a=>a.category==='person');
  const n=Math.min(this.cfg.iconLimit,10,pool.length+(hasPerson?0:1));
  const total=pool.reduce((sum,a)=>sum+(a.count||1),0),counts=this.counts(pool),selected=[],allocated={person:0,object:0,place:0};let remaining=pool.slice();
  // Always reserve one person. If none was caught, add a visual-only person
  // without altering the user's caught words or their relative weights.
  const people=remaining.filter(a=>a.category==='person');
  const fallbackPeople=CATALOG.filter(a=>a.category==='person');
  let first;
  if(people.length){let roll=this.random()*people.reduce((sum,a)=>sum+(a.count||1),0);first=people[people.length-1];for(const a of people){roll-=a.count||1;if(roll<=0){first=a;break}}}
  else first={...fallbackPeople[Math.floor(this.random()*fallbackPeople.length)],count:1};
  selected.push(first);allocated.person=1;remaining=remaining.filter(a=>a.id!==first.id);
  while(selected.length<n){const cats=['person','object','place'].filter(c=>remaining.some(a=>a.category===c));cats.sort((a,b)=>(n*counts[b]/total-allocated[b])-(n*counts[a]/total-allocated[a]));const cat=cats[0],options=remaining.filter(a=>a.category===cat);let roll=this.random()*options.reduce((s,a)=>s+(a.count||1),0),chosen=options[options.length-1];for(const a of options){roll-=a.count||1;if(roll<=0){chosen=a;break}}selected.push(chosen);allocated[cat]++;remaining=remaining.filter(a=>a.id!==chosen.id)}
  return this.shuffle(selected);
 }
 burst(preview=false,keep=false){
  if(!preview&&!this.canGenerate()&&!keep){this.onToast('接住一个词，就可以生成。');return false}
  const pool=preview?this.catalog.map(a=>({...a,count:1})):this.bag,selected=keep&&this.bodies.length?this.bodies.map(b=>b.item):this.selectIcons(pool);if(!selected.length)return false;
  this.previewBurst=preview;this.state='burst';this.titleRevealAt=Infinity;this.expanded=false;this.paused=false;this.words=[];this.fallen=[];this.chips=[];this.effects=[];this.bodies=[];this.groups=[];this.burstElapsed=0;this.collisions=0;this.bagPulse=1.2;this.keys.left=this.keys.right=false;
  const avg=pool.reduce((s,a)=>s+(a.count||1),0)/Math.max(1,pool.length);
  this.contactPairs=new Set();this.nextContactPairs=new Set();this.colorHits=0;
  selected.forEach((a,i)=>{
   const asset=this.images[a.asset],base=selected.length<=3?225:selected.length<=6?175:130,size=base*clamp(Math.sqrt((a.count||1)/avg),.78,1.32),basis=size/Math.max(asset.width,asset.height),tw=asset.width*basis,th=asset.height*basis,q=selected.length>1?i/(selected.length-1):.5;
   let ang=(-90+this.cfg.direction+(q-.5)*this.cfg.spread)*Math.PI/180;if(this.cfg.trajectory==='jet')ang=(-90+this.cfg.direction+(q-.5)*Math.min(18,this.cfg.spread))*Math.PI/180;if(this.cfg.trajectory==='radial')ang=(-90+this.cfg.direction+q*360)*Math.PI/180;
   const speed=this.cfg.launchSpeed*this.range(.82,1.12),spinSign=this.range(-1,1),x=this.cx+this.range(-15,15),y=this.bracketY+43;
   this.bodies.push({item:a,index:i,tw,th,tx:x,ty:y,x,y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,angle:this.range(-.15,.15),omega:spinSign*this.cfg.spin*Math.PI/180,spinSign,delay:i*this.cfg.stagger,age:-i*this.cfg.stagger,scale:.12,r:Math.min(tw,th)*.42,mass:Math.max(.5,tw*th/18000),trail:[],trailClock:0,colorUntil:0,tint:0});
  });this.onChange();return true;
 }
 step(dt){
  dt=clamp(dt,0,1/30);if(this.paused)return;this.time+=dt;
  this.stepFallen(dt);
  if(this.keys.left)this.moveCatch(this.targetX-650*dt);if(this.keys.right)this.moveCatch(this.targetX+650*dt);
  this.cx=mix(this.cx,this.targetX,1-Math.exp(-22*dt));this.bagPulse*=Math.exp(-7*dt);
  for(const effect of this.effects)effect.age+=dt;this.effects=this.effects.filter(e=>e.age<.9);
  for(let i=0;i<this.chips.length;i++){const c=this.chips[i];const row=Math.floor(i/3),col=i%3;const x=(col-1)*Math.min(90,this.cfg.catchWidth/3.7);const y=26+row*20;c.vx+=((x-c.x)*45-c.vx*11)*dt;c.vy+=((y-c.y)*45-c.vy*11)*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;}
  if(['playing','supplement'].includes(this.state)){
   this.elapsed+=dt;if(this.state==='playing'&&this.elapsed>=this.cfg.duration){this.finish();return}
   this.spawnClock-=dt;if(this.spawnClock<=0){this.spawn();this.spawnClock+=this.cfg.spawnInterval}
   const oldWords=this.words;this.words=[];for(let wi=0;wi<oldWords.length;wi++){const word=this.wordSize(oldWords[wi]),prev=word.y;word.vy+=this.cfg.wordGravity*dt;word.y+=word.vy*dt;word.x+=word.vx*dt;word.x=clamp(word.x,word.hx+6,W-word.hx-6);
    const catchLine=this.bracketY+37;const caught=prev+word.hy<catchLine&&word.y+word.hy>=catchLine&&Math.abs(word.x-this.cx)<this.cfg.catchWidth/2-16;
    if(caught){this.catchWord(word);if(!['playing','supplement'].includes(this.state)){for(const rest of oldWords.slice(wi+1))this.dropWord(rest);this.words=[];break}}
    else if(word.y+word.hy>=catchLine)this.dropWord(word);
    else this.words.push(word);
   }
  }
  if(['burst','free','settling'].includes(this.state))this.stepBodies(dt);
 }
 stepBodies(dt){
  this.burstElapsed+=dt;const lastDelay=Math.max(0,...this.bodies.map(b=>b.delay));
  if(this.state==='burst'&&this.burstElapsed>lastDelay+this.cfg.flightTime){this.state='free';this.titleRevealAt=this.time;this.onChange()}
  if(this.state==='settling'){
   this.settleElapsed+=dt;const t=ease(this.settleElapsed/1.25);for(const b of this.bodies){b.x=mix(b.sx,b.tx,t);b.y=mix(b.sy,b.ty,t);b.angle=b.sa+angleDelta(b.sa,b.ta)*t;b.scale=mix(b.ss,1,t)}
   if(t>=1){this.state='result';for(const b of this.bodies){b.x=b.tx;b.y=b.ty;b.angle=b.ta;b.scale=1;b.vx=b.vy=0}this.onChange()}return;
  }
  const substeps=3,sub=dt/substeps;
  for(let s=0;s<substeps;s++){
   this.nextContactPairs=new Set();
   const alive=[];for(const b of this.bodies){b.age+=sub;if(b.age<0)continue;b.scale=.12+.88*ease(b.age/.45);const drag=Math.exp(-this.cfg.drag*sub);
    if(this.cfg.trajectory==='spiral'&&b.age<3.5){const f=180*Math.sin(b.age*7+b.index*.8);b.vx+=f*sub;b.vy-=80*sub}
    b.vy+=this.cfg.burstGravity*sub;b.vx*=drag;b.vy*=drag;b.x+=b.vx*sub;b.y+=b.vy*sub;b.angle+=b.omega*sub;b.omega*=Math.exp(-this.cfg.drag*.13*sub);
    if(this.state==='free'){
     const speed=Math.hypot(b.vx,b.vy),target=130+this.cfg.launchSpeed*.1;
     if(speed<target){const a=speed>1?Math.atan2(b.vy,b.vx):b.index*2.399;const v=mix(speed,target,1-Math.exp(-2*sub));b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v}
     // Gentle cross-current prevents gravity or drag from trapping bodies on the floor.
     b.vx+=Math.sin(this.time*.8+b.index*2.4)*24*sub;
     if(this.cfg.spin)b.omega=mix(b.omega,b.spinSign*this.cfg.spin*Math.PI/180,1-Math.exp(-sub));
    }
    if(this.cfg.walls)this.wallCollision(b);alive.push(b);
   }
   if(this.cfg.collision)for(let pass=0;pass<2;pass++)for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++)this.bodyCollision(alive[i],alive[j]);
   if(this.cfg.walls)for(const b of alive)this.wallCollision(b);
   this.contactPairs=this.nextContactPairs;
  }
  for(const b of this.bodies){if(b.age<0)continue;b.trailClock+=dt;if(b.trailClock>.04){b.trailClock=0;b.trail.push([b.x,b.y]);if(b.trail.length>22)b.trail.shift()}}
 }
 beginSettle(){
  const placed=[];
  for(const b of this.shuffle(this.bodies)){
   const r=Math.hypot(b.tw,b.th)*this.cfg.spriteScale/2;let best=null,bestScore=-Infinity;
   for(let i=0;i<90;i++){const x=this.range(r+14,W-r-14),y=this.range(285+r,940-r);const score=placed.length?Math.min(...placed.map(p=>Math.hypot(x-p.x,y-p.y)-r-p.r)):this.random()*200;if(score>bestScore){best={x,y,r};bestScore=score}}
   b.tx=best.x;b.ty=best.y;b.ta=this.range(-.38,.38);placed.push(best);b.sx=b.x;b.sy=b.y;b.sa=b.angle;b.ss=b.scale;
  }this.state='settling';this.settleElapsed=0;this.onChange();
 }
 bodyScale(b){return b.scale*Math.min(this.cfg.spriteScale,(W-32)/Math.hypot(b.tw,b.th),(H-312)/Math.hypot(b.tw,b.th))}
 wallCollision(b){
  const scale=this.bodyScale(b);const c=Math.abs(Math.cos(b.angle)),s=Math.abs(Math.sin(b.angle));const hx=(b.tw*c+b.th*s)*scale/2,hy=(b.tw*s+b.th*c)*scale/2;
  const minX=8+hx,maxX=W-8-hx,minY=280+hy,maxY=1128-hy;const e=this.cfg.restitution;
  const kick=this.state==='free'?90:0;
  if(b.x<minX){b.x=minX;if(b.vx<0){b.vx=Math.max(kick,-b.vx*e);b.omega*=-.75;this.collisions++}}if(b.x>maxX){b.x=maxX;if(b.vx>0){b.vx=-Math.max(kick,b.vx*e);b.omega*=-.75;this.collisions++}}
  if(b.y<minY){b.y=minY;if(b.vy<0){b.vy=Math.max(kick,-b.vy*e);this.collisions++}}if(b.y>maxY){b.y=maxY;if(b.vy>0){b.vy=-Math.max(kick,Math.sqrt(Math.max(0,this.cfg.burstGravity)*500),b.vy*e);b.vx*=.92;b.omega*=.88;this.collisions++}}
 }
 bodyCollision(a,b){
  if(a.age<.24||b.age<.24)return;const ra=a.r*this.bodyScale(a),rb=b.r*this.bodyScale(b);const dx=b.x-a.x,dy=b.y-a.y;const d2=dx*dx+dy*dy,r=ra+rb;if(d2>=r*r)return;
  const pair=Math.min(a.index,b.index)+':'+Math.max(a.index,b.index);
  if(!this.contactPairs.has(pair)&&!this.nextContactPairs.has(pair)){
   const target=a.item.category==='person'&&b.item.category!=='person'?b:b.item.category==='person'&&a.item.category!=='person'?a:null;
   if(target){target.colorUntil=this.time+3;target.tint=Math.floor(this.random()*5);this.colorHits++}
  }
  this.nextContactPairs.add(pair);
  const dist=Math.max(.01,Math.sqrt(d2));const nx=dist<.05?1:dx/dist,ny=dist<.05?0:dy/dist;const ia=1/a.mass,ib=1/b.mass,correction=(r-dist)*.75/(ia+ib);a.x-=nx*correction*ia;a.y-=ny*correction*ia;b.x+=nx*correction*ib;b.y+=ny*correction*ib;
  const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv>=0)return;const j=-(1+this.cfg.restitution)*rv/(ia+ib);a.vx-=j*nx*ia;a.vy-=j*ny*ia;b.vx+=j*nx*ib;b.vy+=j*ny*ib;
  const tangent=(b.vx-a.vx)*(-ny)+(b.vy-a.vy)*nx;const spin=this.cfg.spin?clamp(tangent*.003,-1,1):0;a.omega-=spin;b.omega+=spin;this.collisions++;
 }
}
globalThis.UrbanEngine=UrbanEngine;
globalThis.URBAN_DEFAULTS=DEFAULTS;
globalThis.URBAN_CATALOG=CATALOG;
