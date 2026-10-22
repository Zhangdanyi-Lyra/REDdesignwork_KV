function roundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function imageAt(ctx,img,x,y,w,h){if(img)ctx.drawImage(img,x,y,w,h)}
const COLLISION_COLORS=['#4597f8','#ff7900','#d4ff3a','#ff8be8','#966400'];
const tintCache=new Map();
const titleGlyphCache=new Map();
let titleBaseCache=null;
const nearbyShadowCache=new WeakMap();
function nearbyShadow(img){
 if(!img)return null;
 if(!nearbyShadowCache.has(img)){
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const c=canvas.getContext('2d');c.drawImage(img,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#d9d9d9';c.fillRect(0,0,canvas.width,canvas.height);
  nearbyShadowCache.set(img,canvas);
 }
 return nearbyShadowCache.get(img);
}
function titleBase(img){
 if(!img)return null;
 if(!titleBaseCache){
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const c=canvas.getContext('2d');c.drawImage(img,0,0);
  const pixels=c.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
   const darkness=255-Math.min(data[i],data[i+1],data[i+2]);
   data[i+3]=Math.min(data[i+3],Math.min(255,darkness*4));
  }
  c.putImageData(pixels,0,0);titleBaseCache=canvas;
 }
 return titleBaseCache;
}
function titleGlyph(img){
 if(!img)return null;
 if(!titleGlyphCache.has(img)){
  // Figma's isolated PNG exports have an opaque white backing. Restore the
  // foreground-only layer so the blue glyphs sit on the title's dark shape.
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const c=canvas.getContext('2d');c.drawImage(img,0,0);
  const pixels=c.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
   const a=Math.max(0,Math.min(255,(data[i+2]-data[i]) * 2.2));
   data[i]=69;data[i+1]=151;data[i+2]=248;data[i+3]=Math.min(data[i+3],a);
  }
  c.putImageData(pixels,0,0);titleGlyphCache.set(img,canvas);
 }
 return titleGlyphCache.get(img);
}
function bodyImage(e,b){
 if(b.item.category==='person'||!(b.colorUntil>e.time))return e.images[b.item.asset];
 if(!b.item.runtimeTint)return e.images[b.item.colorAsset]||e.images[b.item.asset];
 const key=b.item.asset+':'+b.tint;
 if(!tintCache.has(key)){
  const img=e.images[b.item.asset],c=document.createElement('canvas');c.width=img.width;c.height=img.height;
  // Replace RGB, preserving the source alpha once. Multiply leaves black edges black.
  const t=c.getContext('2d');t.drawImage(img,0,0);t.globalCompositeOperation='source-in';t.fillStyle=COLLISION_COLORS[b.tint];t.fillRect(0,0,c.width,c.height);tintCache.set(key,c);
 }
 return tintCache.get(key);
}
function drawCityTitle(ctx,e){
 const phase=Math.sin(e.time*2*Math.PI/2.8),breath=1+phase*.008;
 ctx.save();ctx.translate(384,132);ctx.scale(breath,breath);ctx.translate(-384,-132);
 imageAt(ctx,e.images['43:79'],28.5,37.1,711,169.92003);
 imageAt(ctx,e.images['43:74'],3.80176,9.65097,758.74219,225.46661);
 imageAt(ctx,e.images['43:74'],3.80176,9.65097,758.74219,225.46661);
 imageAt(ctx,titleBase(e.images['title:base']),2,18,762,236);
 imageAt(ctx,titleGlyph(e.images['title:chun']),230,73,149,168);
 imageAt(ctx,titleGlyph(e.images['title:wan']),379,98,129,143);
 ctx.restore();
}
function drawNearbyTitle(ctx,e){
 const phase=Math.sin(e.time*2*Math.PI/2.8),breath=1+phase*.008;
 ctx.save();ctx.translate(384,132);ctx.scale(breath,breath);ctx.translate(-384,-132);
 // Keep the pale backing aligned with the complete, irregular title silhouette.
 imageAt(ctx,nearbyShadow(e.images['64:2689']),17,24,735,261);
 imageAt(ctx,e.images['64:2689'],10,13,735,261);
 ctx.restore();
}
function drawFooterTag(ctx,e){
 const img=e.images['figma:paidia'];
 if(img)ctx.drawImage(img,0,0,33,76,0,1064,33,76);
 ctx.save();ctx.font='300 16px "PingFang HK","PingFang SC",sans-serif';ctx.fillStyle='#171717';ctx.textBaseline='alphabetic';
 const lines=[['附近，',1096],['另有玩法。',1117]];
 for(const [line,y] of lines){
  ctx.fillText(line,37,y);const width=ctx.measureText(line).width;
  ctx.fillStyle='#4597f8';ctx.fillRect(37,y+2,width,2);
  ctx.fillStyle='#d4ff3a';for(let x=40;x<37+width;x+=15){ctx.beginPath();ctx.arc(x,y+8,4,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#171717';
 }
 ctx.restore();
}
function drawBase(ctx,e){
 ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
 imageAt(ctx,e.images['44:235'],5.4966,245.5588,732.9238,750.3412);
 ctx.fillStyle='rgba(255,252,250,.38)';ctx.fillRect(-1,0,768,1148);
 ctx.fillStyle='#d9d9d9';ctx.fillRect(626,1135,142,17);
 const bands=[[158,1131,74,21.111,'#d4ff3a'],[0,1135.499,162,16.612,'#4597f8'],[72,1131,151,16.612,'#ff8be8'],[0,1131,162,16.612,'#ff4c3f'],[162,1131,10,16.612,'#966400'],[390,1131,74,21.051,'#d4ff3a'],[232,1131,162,16.518,'#4597f8'],[464,1131,304,4.318,'#4597f8'],[304,1135.474,151,16.518,'#ff8be8'],[232,1135.474,162,16.518,'#ff4c3f'],[626,1135,68,17,'#ff4c3f'],[394,1135.474,10,16.518,'#966400'],[758,1131,10,20.511,'#966400'],[464,1135,162,17,'#ff8be8'],[626,1148,132,4,'#d4ff3a']];
 for(const [x,y,w,h,c] of bands){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
 drawFooterTag(ctx,e);
 const switched=['free','settling','result'].includes(e.state);
 const nearbyAlpha=switched?1:0;
 if(nearbyAlpha<1){ctx.save();ctx.globalAlpha=1-nearbyAlpha;drawCityTitle(ctx,e);ctx.restore()}
 if(nearbyAlpha>0){ctx.save();ctx.globalAlpha=nearbyAlpha;drawNearbyTitle(ctx,e);ctx.restore()}
}
function drawGuides(ctx,e){
 ctx.save();ctx.strokeStyle='#4597f85c';ctx.lineWidth=1.5;ctx.setLineDash([5,8]);
 for(let i=0;i<5;i++){let a=(-90+e.cfg.direction+(i/4-.5)*(e.cfg.trajectory==='jet'?18:e.cfg.spread))*Math.PI/180;if(e.cfg.trajectory==='radial')a=(-90+e.cfg.direction+i/5*360)*Math.PI/180;let x=e.cx,y=e.bracketY+43,vx=Math.cos(a)*e.cfg.launchSpeed,vy=Math.sin(a)*e.cfg.launchSpeed;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<70;j++){const dt=.022;vy+=e.cfg.burstGravity*dt;vx*=Math.exp(-e.cfg.drag*dt);vy*=Math.exp(-e.cfg.drag*dt);x+=vx*dt;y+=vy*dt;if(x<5||x>W-5||y<300||y>1128)break;ctx.lineTo(x,y)}ctx.stroke()}
 ctx.restore();
}
function drawWord(ctx,e,w,small=false){
 const size=small?15:w.size||e.cfg.wordSize,text=w.text||w.item.label,font=wordFont(w.fontKind,size);ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.angle||0);ctx.font=font;
 const metrics=ctx.measureText(text),width=Math.min(W-24,metrics.width+size*.2),height=size*34/30;
 const age=typeof w.birth==='number'&&e.state!=='original'&&!small?e.time-w.birth:1;
 const melt=1-ease(clamp(age/.34,0,1));
 ctx.fillStyle='#d9d9d9';
 if(melt>0){ctx.shadowColor='rgba(150,150,150,.38)';ctx.shadowBlur=8*melt;roundRect(ctx,-width/2,-height/2,width,height,Math.min(height/2,14*melt));ctx.fill();ctx.shadowBlur=0}
 else ctx.fillRect(-width/2,-height/2,width,height);
 ctx.fillStyle=w.fontKind==='latin'?'#966400':'#4597f8';ctx.textAlign='center';ctx.textBaseline='alphabetic';
 const ascent=metrics.actualBoundingBoxAscent||size*.8,descent=metrics.actualBoundingBoxDescent||size*.12;ctx.fillText(text,0,(ascent-descent)/2);ctx.restore();
}
function titleEdgeAt(x){
 const profile=[[0,179],[85,206],[170,210],[255,244],[350,207],[460,251],[550,244],[630,229],[720,205],[768,190]];
 for(let i=1;i<profile.length;i++)if(x<=profile[i][0]){const a=profile[i-1],b=profile[i];return mix(a[1],b[1],(x-a[0])/(b[0]-a[0]))}
 return 190;
}
function drawMeltBridge(ctx,e,w){
 if(typeof w.birth!=='number')return;
 const age=e.time-w.birth;if(age<0||age>=.34)return;
 const t=clamp(age/.34,0,1),melt=1-ease(t),originX=w.sourceX??w.x,originY=titleEdgeAt(originX),endY=w.y-(w.hy||w.h/2)+4;
 if(endY<=originY+3)return;
 const parentWidth=13*melt+2,neckWidth=1+8*(1-t)**2,childWidth=Math.min(15,w.w*.18)*melt+1;
 ctx.save();ctx.globalAlpha=melt;ctx.shadowColor='rgba(125,125,125,.42)';ctx.shadowBlur=7*melt;
 const gradient=ctx.createLinearGradient(0,originY,0,endY);gradient.addColorStop(0,'#494949');gradient.addColorStop(.6,'#b5b5b5');gradient.addColorStop(1,'#d9d9d9');ctx.fillStyle=gradient;
 ctx.beginPath();ctx.moveTo(originX-parentWidth,originY-3);
 ctx.bezierCurveTo(originX-parentWidth,originY+18,w.x-neckWidth,endY-23,w.x-childWidth,endY+2);
 ctx.lineTo(w.x+childWidth,endY+2);
 ctx.bezierCurveTo(w.x+neckWidth,endY-23,originX+parentWidth,originY+18,originX+parentWidth,originY-3);
 ctx.closePath();ctx.fill();ctx.restore();
 // The final pinched droplet lingers briefly as the neck snaps away.
 if(t>.68){ctx.save();ctx.globalAlpha=(1-t)*.65;ctx.fillStyle='#b7b7b7';ctx.beginPath();ctx.arc(mix(originX,w.x,.55),mix(originY,endY,.8),2.7*(1-t),0,Math.PI*2);ctx.fill();ctx.restore()}
}
function drawPoster(ctx,e,scale=1){
 ctx.save();ctx.scale(scale,scale);ctx.clearRect(0,0,W,H);ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();drawBase(ctx,e);
 if(e.cfg.showGuides&&e.state!=='original')drawGuides(ctx,e);
 for(const w of e.fallen)drawWord(ctx,e,w);
 for(const w of e.words){drawMeltBridge(ctx,e,w);drawWord(ctx,e,w)}
 if(['playing','supplement','review','needs'].includes(e.state)){
  ctx.save();ctx.beginPath();ctx.rect(e.cx-e.cfg.catchWidth/2+16,e.bracketY-18,e.cfg.catchWidth-32,130);ctx.clip();
  for(const c of e.chips)drawWord(ctx,e,{...c,x:e.cx+c.x,y:e.bracketY+c.y},true);ctx.restore();
 }
 for(const b of e.bodies){if(b.age<0&&e.state!=='result')continue;
  if(e.cfg.showGuides&&b.trail.length>1&&e.state!=='result'){ctx.save();ctx.strokeStyle='#4597f834';ctx.lineWidth=2;ctx.beginPath();b.trail.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.restore()}
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);const s=e.bodyScale(b);imageAt(ctx,bodyImage(e,b),-b.tw*s/2,-b.th*s/2,b.tw*s,b.th*s);ctx.restore();
  if(e.cfg.showColliders){ctx.save();ctx.strokeStyle='#e7566899';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r*s,0,Math.PI*2);ctx.stroke();ctx.restore()}
 }
 if(['result','free'].includes(e.state)&&e.cfg.showLabels){ctx.save();ctx.font='500 14px "PingFang SC","Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle='#637387';for(const b of e.bodies)ctx.fillText(b.item.label+' × '+(b.item.count||1),b.x,b.y+b.th*e.cfg.spriteScale/2+20,220);ctx.restore()}
 const pulse=1+e.bagPulse*.065;const bw=e.cfg.catchWidth*pulse,bh=93.4*(1+e.bagPulse*.04);imageAt(ctx,e.images['43:158'],e.cx-bw/2,e.bracketY-(bh-93.4)/2,bw,bh);
 const action=e.posterAction();if(action){
  const breathe=(Math.sin(e.time*4.2)+1)/2,s=1+breathe*.055,alpha=.72+breathe*.28;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(action.x,action.y);if(action.kind==='expand')ctx.rotate(Math.PI);ctx.scale(s,s);
  if(action.kind==='start'){
   ctx.fillStyle='#d4ff3a';ctx.strokeStyle='#4597f8';ctx.lineWidth=6;ctx.fillRect(-46,-35,92,70);ctx.strokeRect(-43,-32,86,64);
   ctx.font='900 40px "HarmonyOS Sans SC","Arial Black",sans-serif';ctx.fillStyle='#ff8be8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('GO',0,3);
  }else{ctx.shadowColor='#d4ff3a';ctx.shadowBlur=3+breathe*8;imageAt(ctx,e.images['button:new'],-35,-46,70,92)}ctx.restore();
 }
 ctx.restore();
}
globalThis.drawUrbanPoster=drawPoster;
function longPosterHeight(){return 2006}
function longCard(ctx,x,y,w,h,points){
 ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(points[0][0]*w,points[0][1]*h);
 for(const [px,py] of points.slice(1))ctx.lineTo(px*w,py*h);
 ctx.closePath();ctx.fillStyle='#f0efef';ctx.fill();ctx.strokeStyle='#fafafa';ctx.lineJoin='round';ctx.lineWidth=25;ctx.stroke();ctx.lineWidth=7;ctx.strokeStyle='#e9e9e9';ctx.stroke();ctx.restore();
}
function longHeading(ctx,x,y,first,second){
 ctx.fillStyle='#fff';ctx.fillRect(x,y,185,122);
 ctx.fillStyle='#4097ff';ctx.font='900 40px "Poster Source Han","Source Han Serif CN","Songti SC",serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';
 ctx.fillText(first,x+20,y+52);ctx.fillText(second,x+20,y+102);
 ctx.fillStyle='#4097ff';ctx.fillRect(x-2,y+7,2,126);ctx.fillRect(x+185,y-3,2,126);
 ctx.beginPath();ctx.arc(x+184,y+119,6,0,Math.PI*2);ctx.arc(x,y+7,6,0,Math.PI*2);ctx.fill();
}
function longMicrocopy(ctx,text,x,y,angle,length){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(length,-11);ctx.strokeStyle='#e6e6e6';ctx.lineWidth=1;ctx.stroke();
 ctx.fillStyle='#b9b9b9';ctx.font='500 10px "PingFang SC",sans-serif';ctx.globalAlpha=.65;
 const phrase=(text+'  ').repeat(12);ctx.fillText(phrase,0,0,length);ctx.restore();
}
const LONG_TEXT_1=['没有目的地的漫游、','盲盒路线、City','Walk 打卡——','把“迷路”变成一','种玩法。'];
const LONG_TEXT_2=['咖啡、草坪、躺椅','——什么都不做，','也是一种正经事。'];
function drawTypedLines(ctx,lines,x,y,spacing,count){
 let remaining=count;
 for(let i=0;i<lines.length;i++){
  const letters=Array.from(lines[i]);if(remaining<=0)break;
  ctx.fillText(letters.slice(0,remaining).join(''),x,y+i*spacing);
  remaining-=letters.length;
 }
}
function drawLongPoster(ctx,e,scale=1,typing=null){
 const height=longPosterHeight();ctx.save();ctx.scale(scale,scale);ctx.beginPath();ctx.rect(0,0,W,height);ctx.clip();ctx.fillStyle='#fff';ctx.fillRect(0,0,W,height);
 // Figma 30:34 expanded page: translucent map, two paper fields, three suns.
 ctx.save();ctx.globalAlpha=.48;imageAt(ctx,e.images['44:235'],5,320,733,750);imageAt(ctx,e.images['44:235'],5,930,733,750);ctx.restore();
 imageAt(ctx,e.images['figma:long-card-1'],75,172,532,786);
 // Figma Rectangle 28 is a separate gray field beneath the middle line.
 ctx.fillStyle='#f0efef';ctx.fillRect(157,581,330,69);
 imageAt(ctx,e.images['figma:long-card-2'],81,1007,588,791);
 imageAt(ctx,e.images['figma:long-textpath-1'],77,272,269,630);
 imageAt(ctx,e.images['figma:long-textpath-2'],373,1016,291,471);
 imageAt(ctx,e.images['figma:long-sun'],575,40,162,160);
 imageAt(ctx,e.images['figma:long-sun'],126,820,171,169);
 imageAt(ctx,e.images['figma:long-sun'],478,1574,171,169);
 imageAt(ctx,e.images['figma:long-market'],18,194,622,646);
 imageAt(ctx,e.images['figma:long-heading-1'],352,224,245,138);
 imageAt(ctx,e.images['figma:long-heading-2'],133,1088,416,138);
 ctx.fillStyle='#464646';ctx.font='900 40px "Poster Source Han","Source Han Serif CN","Songti SC",serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';
 drawTypedLines(ctx,LONG_TEXT_1,165,493,57,typing?typing.first:Infinity);
 imageAt(ctx,e.images['figma:long-cloud'],67,1191,685,501);
 drawTypedLines(ctx,LONG_TEXT_2,216,1412,55,typing?typing.second:Infinity);
 imageAt(ctx,e.images['figma:long-person'],4,1728,764,256);
 ctx.fillStyle='#d9d9d9';ctx.fillRect(626,height-17,142,17);
 const bands=[[0,1990,162,17,'#ff4c3f'],[72,1985,151,17,'#ff8be8'],[162,1985,10,17,'#966400'],[162,1990,70,16,'#d4ff3a'],[232,1985,162,17,'#4597f8'],[304,1990,151,16,'#ff8be8'],[390,1985,74,21,'#d4ff3a'],[394,1990,10,16,'#966400'],[464,1990,162,16,'#ff8be8'],[626,1990,68,16,'#ff4c3f'],[694,2002,64,4,'#d4ff3a'],[758,1985,10,21,'#966400']];
 for(const [x,y,w,h,color] of bands){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}ctx.restore();
}
globalThis.longPosterHeight=longPosterHeight;
globalThis.drawLongPoster=drawLongPoster;
globalThis.longTextLengths={first:LONG_TEXT_1.join('').length,second:LONG_TEXT_2.join('').length};
