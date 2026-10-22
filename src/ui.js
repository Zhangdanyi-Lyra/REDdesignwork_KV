const $=id=>document.getElementById(id);
const CONTROLS={
 wordControls:[['wordSize','文字大小',16,84,1,'px'],['fallSpeed','下落初速度',0,900,10,'px/s'],['wordGravity','文字重力',0,2400,20,'px/s²'],['spawnInterval','落词间隔',.15,1.5,.05,'s'],['duration','接词时长',3,20,1,'s'],['catchWidth','括弧宽度',230,650,1,'px']],
 burstControls:[['launchSpeed','迸发速度',150,1800,10,'px/s'],['spread','扩散角度',0,180,1,'°'],['direction','发射偏向',-80,80,1,'°'],['spin','旋转速度',0,720,5,'°/s'],['burstGravity','迸发重力',-300,1500,10,'px/s²'],['drag','空气阻力',0,3,.05,''],['stagger','素材发射间隔',0,.25,.005,'s']],
 physicsControls:[['restitution','碰撞回弹',0,.98,.01,''],['spriteScale','图案大小',.5,2.5,.05,'×'],['flightTime','初始迸发时长',.8,8,.1,'s'],['iconLimit','图案数量上限',1,10,1,'个']]
};
const CHECKS=[['collision','素材相互碰撞'],['walls','画面边界碰撞'],['showGuides','显示轨迹参考'],['showColliders','显示碰撞范围'],['showLabels','显示图案对应词']];
const PRESETS={float:{launchSpeed:720,spread:120,spin:80,burstGravity:10,drag:.7,stagger:.06,flightTime:4.2,restitution:.42,collision:true,walls:true,autoLayout:false,trajectory:'fan'},bounce:{launchSpeed:1150,spread:95,spin:320,burstGravity:560,drag:.1,stagger:.045,flightTime:5,restitution:.9,collision:true,walls:true,autoLayout:false,trajectory:'fan'},quick:{launchSpeed:1150,spread:85,spin:100,burstGravity:60,drag:.4,stagger:.02,flightTime:1.3,restitution:.55,collision:true,walls:true,autoLayout:false,trajectory:'jet'}};
let engine,loaded=false,lastFrame=0,accumulator=0,lastUI=0,dragging=false,pointerId=null,toastTimer,catchAudio=null,lastDropAt=0;
let longTyping=null,lastLongRender=0,longRenderDirty=false;
const images={};
let saved={};try{saved=JSON.parse(localStorage.getItem('urban-play-collision-v1')||'{}')}catch{}
if(saved.spriteScaleRevision!==2)saved.spriteScale=DEFAULTS.spriteScale;
let tutorialSeen=false,tutorialVisible=false;try{tutorialSeen=localStorage.getItem('urban-play-catch-tutorial-v1')==='yes'}catch{}
function dismissTutorial(){if(!tutorialVisible)return;tutorialVisible=false;tutorialSeen=true;$('catchTutorial').classList.remove('show');try{localStorage.setItem('urban-play-catch-tutorial-v1','yes')}catch{}}
function persist(){try{localStorage.setItem('urban-play-collision-v1',JSON.stringify(engine.cfg))}catch{}}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400)}
function unlockCatchAudio(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!catchAudio)catchAudio=new Audio();if(catchAudio.state==='suspended')catchAudio.resume()}catch{}}
function playDrop(){
 if(!catchAudio||catchAudio.state!=='running')return;const now=catchAudio.currentTime;if(now-lastDropAt<.09)return;lastDropAt=now;
 try{const osc=catchAudio.createOscillator(),gain=catchAudio.createGain();osc.type='sine';osc.frequency.setValueAtTime(920,now);osc.frequency.exponentialRampToValueAtTime(530,now+.13);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);
  osc.connect(gain);gain.connect(catchAudio.destination);osc.start(now);osc.stop(now+.19);
 }catch{}
}
function startCatch(){unlockCatchAudio();engine.start();tutorialVisible=!tutorialSeen;updateUI();closePanel();$('poster').focus({preventScroll:true})}
function syncControls(){if(!engine)return;for(const defs of Object.values(CONTROLS))for(const [k,label,min,max,step] of defs){const r=$('range-'+k),n=$('num-'+k);r.value=engine.cfg[k];n.value=Number(Number(engine.cfg[k]).toFixed(3));r.style.setProperty('--p',((engine.cfg[k]-min)/(max-min)*100)+'%')}for(const [k] of CHECKS)$('check-'+k).checked=engine.cfg[k];$('trajectory').value=engine.cfg.trajectory}
function initControls(){
 for(const [target,defs] of Object.entries(CONTROLS))for(const [k,label,min,max,step,unit] of defs){const wrap=document.createElement('div');wrap.className='control';wrap.innerHTML=`<div class="control-top"><label for="range-${k}">${label}</label><span class="numwrap"><input type="number" id="num-${k}" min="${min}" max="${max}" step="${step}" aria-label="${label}数值"><span>${unit}</span></span></div><input class="range" type="range" id="range-${k}" min="${min}" max="${max}" step="${step}" aria-label="${label}">`;$(target).appendChild(wrap);
  const apply=v=>{if(!Number.isFinite(v))return;engine.setConfig(k,clamp(v,min,max));syncControls();persist();document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('active'))};$('range-'+k).addEventListener('input',ev=>apply(Number(ev.target.value)));$('num-'+k).addEventListener('change',ev=>apply(Number(ev.target.value)));
 }
 for(const [k,label] of CHECKS){const wrap=document.createElement('label');wrap.className='check';wrap.innerHTML=`<span>${label}</span><input id="check-${k}" type="checkbox">`;$('physicsControls').appendChild(wrap);$('check-'+k).addEventListener('change',ev=>{engine.setConfig(k,ev.target.checked);persist()})}
 const note=document.createElement('p');note.className='footnote';note.textContent='素材碰撞采用二维圆形近似；可打开碰撞范围查看。物体与地点碰到人物后变彩色 3 秒，图案持续运动。';$('physicsControls').appendChild(note);
 $('trajectory').addEventListener('change',ev=>{engine.setConfig('trajectory',ev.target.value);persist()});
 for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>{for(const [k,v]of Object.entries(PRESETS[b.dataset.preset]))engine.setConfig(k,v);syncControls();persist();document.querySelectorAll('[data-preset]').forEach(el=>el.classList.toggle('active',el===b));toast('预设已应用，点击“直接迸发”查看。')});
 syncControls();
}
function initMapping(){
 for(const a of engine.catalog){const row=document.createElement('div');row.className='mapping-row';const img=document.createElement('img');img.src=images[a.asset].src;img.alt=a.label;const input=document.createElement('input');input.value=a.label;input.maxLength=8;input.id='map-label-'+a.id;input.setAttribute('aria-label','素材词语 '+a.label);const select=document.createElement('select');select.id='map-category-'+a.id;select.setAttribute('aria-label','素材类别 '+a.label);for(const [v,n]of [['person','人物'],['object','物体'],['place','地点']]){const o=document.createElement('option');o.value=v;o.textContent=n;select.appendChild(o)}select.value=a.category;row.append(img,input,select);$('mapping').appendChild(row)}
 $('applyMapping').addEventListener('click',()=>{const next=engine.catalog.map(a=>({...a,label:$('map-label-'+a.id).value.trim(),category:$('map-category-'+a.id).value}));if(next.some(a=>!a.label)){toast('请为每个素材填写词语。');return}if(new Set(next.map(a=>a.label)).size!==next.length){toast('请使用互不重复的词语。');return}engine.catalog=next;engine.start();closePanel();toast('词库已应用，新一轮开始。')});
}
function missingHint(){return '这次还没接到词，再接一个就能生成。'}
function updateUI(){
 if(!engine)return;const s=engine.state,c=engine.counts(),possible=engine.possible();
 $('sizeValue').textContent=Math.round(engine.cfg.spriteScale*100)+'%';$('sizeDown').disabled=engine.cfg.spriteScale<=.5;$('sizeUp').disabled=engine.cfg.spriteScale>=2.5;
 if(!['result','free'].includes(s)&&document.body.classList.contains('long-view'))closeLongPoster();
 const stateText={original:'原稿预览',playing:'接住附近的玩法',supplement:'补接中 · 不限时',review:'词袋已准备好',needs:'再接一个词',burst:engine.previewBurst?'图案动效预览':'词语正在变成玩法',settling:'图案正在随机停落',result:engine.previewBurst?'预览完成':'你的城市纯玩海报',free:'持续碰撞 · 遇见人物变彩色'};
 $('stateLabel').textContent=stateText[s]+(engine.paused?' · 已暂停':'');
 $('timer').textContent=s==='playing'?Math.max(0,engine.cfg.duration-engine.elapsed).toFixed(1)+' s':['burst','free','settling'].includes(s)?engine.bodies.length+' 个图案':s==='original'?'FIGMA / 30:34':s==='supplement'?'∞':s==='result'?engine.bodies.length+' 个图案':'可生成 '+possible+' 个图案';
 $('progress').style.width=s==='playing'?(engine.elapsed/engine.cfg.duration*100)+'%':s==='original'?'0%':s==='burst'?Math.min(100,engine.burstElapsed/(engine.cfg.flightTime+engine.bodies.length*engine.cfg.stagger+1.25)*100)+'%':['result','review'].includes(s)?'100%':'0%';
 $('play').textContent=s==='needs'?'继续补接':['original','playing'].includes(s)?(s==='playing'?'重新开始':'开始接词'):'再玩一次';
 $('pause').disabled=!engine.active();$('pause').textContent=engine.paused?'继续':'暂停';$('generate').disabled=(!engine.canGenerate()&&!(engine.previewBurst&&engine.bodies.length>0))||['playing','supplement'].includes(s);$('generate').textContent=['result','burst','settling','free'].includes(s)?'重新迸发':'生成海报';
 $('undo').disabled=!['review','needs'].includes(s)||!engine.bag.length;$('shuffle').disabled=!(engine.bodies.length>0||engine.canGenerate());
 const hints={original:'点击括号里的 GO 开始，随后左右拖动括号接词。',playing:'左右拖动接词 · 漏接的词会堆在底部',supplement:missingHint(),review:'点击呼吸箭头生成；迸发后文字将清空。',needs:missingHint(),burst:'调整重力、旋转与碰撞，观察素材如何散开。',settling:'图案碰撞后，独立停在随机位置。',result:engine.expanded?'向下滑动查看长图 · 可以保存整张长图':'点击朝下呼吸的箭头，展开你的玩法长图。',free:'碰到人物亮起 3 秒 · 再次碰撞重新计时 · 可暂停或保存画面'};
 $('hint').textContent=hints[s];$('nPerson').textContent=c.person;$('nObject').textContent=c.object;$('nPlace').textContent=c.place;
 $('catchTutorial').classList.toggle('show',tutorialVisible&&['playing','supplement'].includes(s));
 const action=engine.posterAction();$('poster').classList.toggle('generate-ready',!!action);
 if($('posterAction')){$('posterAction').hidden=!action;if(action){$('posterAction').style.left=((action.x-action.w/2)/W*100)+'%';$('posterAction').style.top=((action.y-action.h/2)/H*100)+'%';$('posterAction').style.width=(action.w/W*100)+'%';$('posterAction').style.height=(action.h/H*100)+'%';const label=action.kind==='start'?'开始接词':action.kind==='generate'?'生成海报':'向下展开玩法长图';$('posterAction').setAttribute('aria-label',label);$('posterAction').setAttribute('title',label)}}
 $('download').textContent=engine.expanded?'保存长图':'保存画面';if($('collapseLong'))$('collapseLong').hidden=!engine.expanded;
 $('combinationInfo').textContent=possible?`已接 ${engine.totalCaught()} 次 / ${engine.bag.length} 种词；本张 ${possible} 个独立图案，大小随接词次数变化。未接到人物时会自动补入一个人物图案。`:'接住词语，生成最多 10 个独立图案；每张至少一个人物。';
 const bagKey=engine.bag.map(a=>a.id+':'+a.label+':'+a.count).join('|');if($('tokens').dataset.key!==bagKey){$('tokens').dataset.key=bagKey;$('tokens').textContent='';if(!engine.bag.length){const n=document.createElement('span');n.className='empty';n.textContent='接住的词会装在这里。';$('tokens').appendChild(n)}for(const a of engine.bag){const n=document.createElement('span');n.className='token';n.style.background=PALETTE[a.category];n.textContent=a.label+' × '+a.count;$('tokens').appendChild(n)}}
}
function fitPoster(){const host=$('posterHost');const available=host.getBoundingClientRect();if(!available.width||!available.height)return;const width=Math.floor(Math.min(host.clientWidth,available.height*W/H,768));$('poster').style.width=width+'px';$('poster').style.height=(width*H/W)+'px';if($('longPoster'))$('longPoster').style.width=width+'px'}
function pointerX(ev){const r=$('canvas').getBoundingClientRect();return(ev.clientX-r.left)/r.width*W}
function pointerY(ev){const r=$('canvas').getBoundingClientRect();return(ev.clientY-r.top)/r.height*H}
function hitGenerate(ev){const action=engine.posterAction(),x=pointerX(ev),y=pointerY(ev);return action&&Math.abs(x-action.x)<=action.w/2&&Math.abs(y-action.y)<=action.h/2}
function renderLongPoster(){const c=$('longCanvas');c.width=W*2;c.height=longPosterHeight(engine)*2;drawLongPoster(c.getContext('2d'),engine,2,longTyping)}
function updateLongTyping(now){
 if(!engine.expanded||!longTyping)return;
 const host=$('posterHost'),canvas=$('longCanvas'),box=canvas.getBoundingClientRect(),viewport=host.getBoundingClientRect(),unit=box.width/W;
 let changed=false;
 for(const [key,y] of [['first',493],['second',1412]]){
  if(longTyping[key]>=longTextLengths[key])continue;
  if(!longTyping.started[key]&&box.top+y*unit<viewport.bottom-35)longTyping.started[key]=now;
  if(!longTyping.started[key])continue;
  const count=Math.min(longTextLengths[key],Math.floor((now-longTyping.started[key])*10/1000));
  if(count!==longTyping[key]){longTyping[key]=count;changed=true}
 }
 longRenderDirty=longRenderDirty||changed;
 if(longRenderDirty&&now-lastLongRender>35){renderLongPoster();lastLongRender=now;longRenderDirty=false}
}
function openLongPoster(){
 if(!['result','free'].includes(engine.state)||engine.expanded)return;engine.expanded=true;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 longTyping=reduced?null:{first:0,second:0,started:{first:0,second:0}};longRenderDirty=false;
 renderLongPoster();$('longPoster').hidden=false;document.body.classList.add('long-view');fitPoster();updateUI();
 requestAnimationFrame(()=>{$('posterHost').scrollTo({top:Math.max(0,$('poster').offsetHeight-$('posterHost').clientHeight*.22),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});$('collapseLong').focus({preventScroll:true})});
}
function closeLongPoster(){engine.expanded=false;longTyping=null;document.body.classList.remove('long-view');if($('longPoster'))$('longPoster').hidden=true;if($('collapseLong'))$('collapseLong').hidden=true;$('posterHost').scrollTop=0;fitPoster()}
function activatePosterAction(){const action=engine.posterAction();if(!action)return;if(action.kind==='start')startCatch();else if(action.kind==='generate')engine.burst(false,false);else openLongPoster()}
function initPosterControls(){
 const action=document.createElement('button');action.id='posterAction';action.className='poster-action';action.hidden=true;action.type='button';action.setAttribute('aria-label','生成海报');action.addEventListener('pointerdown',ev=>ev.stopPropagation());action.addEventListener('keydown',ev=>ev.stopPropagation());action.addEventListener('click',ev=>{ev.stopPropagation();activatePosterAction()});$('poster').appendChild(action);
 const long=document.createElement('section');long.id='longPoster';long.className='long-poster';long.hidden=true;long.setAttribute('aria-label','本次接住图案的竖向长图');const canvas=document.createElement('canvas');canvas.id='longCanvas';long.appendChild(canvas);$('posterHost').appendChild(long);
 const close=document.createElement('button');close.id='collapseLong';close.textContent='收起长图';close.hidden=true;close.onclick=()=>{closeLongPoster();updateUI();$('poster').focus({preventScroll:true})};document.querySelector('.action-row').appendChild(close);
}
function closePanel(){document.body.classList.remove('panel-open')}
function bindUI(){
 persist();
 for(const [id,delta] of [['sizeDown',-.1],['sizeUp',.1]])$(id).onclick=()=>{engine.setConfig('spriteScale',clamp(Math.round((engine.cfg.spriteScale+delta)*100)/100,.5,2.5));syncControls();persist();if(engine.expanded)renderLongPoster()};
 $('play').onclick=()=>{unlockCatchAudio();if(engine.state==='needs'){engine.supplement();tutorialVisible=!tutorialSeen;updateUI();closePanel();$('poster').focus({preventScroll:true})}else startCatch()};
 $('generate').onclick=()=>{const again=['result','burst','settling','free'].includes(engine.state);engine.burst(again&&engine.previewBurst,again);closePanel()};$('burst').onclick=()=>{engine.burst(true,false);closePanel()};$('original').onclick=()=>{engine.original();syncControls();closePanel()};$('pause').onclick=()=>engine.togglePause();$('undo').onclick=()=>engine.undo();$('shuffle').onclick=()=>{engine.burst(engine.previewBurst,false);closePanel()};
 $('reset').onclick=()=>{for(const [k,v]of Object.entries(DEFAULTS))engine.setConfig(k,v);syncControls();persist();toast('参数已恢复默认。')};
 $('mobilePanel').onclick=()=>document.body.classList.add('panel-open');$('closePanel').onclick=closePanel;$('scrim').onclick=closePanel;
 $('togglePanel').onclick=()=>{document.body.classList.toggle('panel-hidden');$('togglePanel').textContent=document.body.classList.contains('panel-hidden')?'展开参数':'收起参数';requestAnimationFrame(fitPoster)};
 const p=$('poster');p.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;if(hitGenerate(ev)){activatePosterAction();ev.preventDefault();return}if(!['original','playing','supplement'].includes(engine.state))return;dragging=true;pointerId=ev.pointerId;p.setPointerCapture(ev.pointerId);engine.moveCatch(pointerX(ev));dismissTutorial();ev.preventDefault()});p.addEventListener('pointermove',ev=>{if(dragging&&ev.pointerId===pointerId&&['original','playing','supplement'].includes(engine.state)){engine.moveCatch(pointerX(ev));ev.preventDefault()}});const end=()=>{dragging=false;pointerId=null};p.addEventListener('pointerup',end);p.addEventListener('pointercancel',end);p.addEventListener('lostpointercapture',end);
 p.addEventListener('keydown',ev=>{const canMove=['original','playing','supplement'].includes(engine.state);if(ev.code==='ArrowLeft'&&canMove){engine.keys.left=true;dismissTutorial();ev.preventDefault()}if(ev.code==='ArrowRight'&&canMove){engine.keys.right=true;dismissTutorial();ev.preventDefault()}if((ev.code==='Enter'||ev.code==='Space')&&engine.posterAction()){activatePosterAction();ev.preventDefault()}else if(ev.code==='Space'&&!engine.expanded){engine.togglePause();ev.preventDefault()}});p.addEventListener('keyup',ev=>{if(ev.code==='ArrowLeft')engine.keys.left=false;if(ev.code==='ArrowRight')engine.keys.right=false});p.addEventListener('blur',()=>{engine.keys.left=engine.keys.right=false});
 document.addEventListener('visibilitychange',()=>{lastFrame=0;accumulator=0;if(document.hidden&&engine.active()&&!engine.paused){engine.paused=true;updateUI()}});
 $('exportConfig').onclick=()=>downloadBlob(new Blob([JSON.stringify({version:1,canvas:{width:W,height:H},parameters:engine.cfg,words:engine.catalog.map(({id,label,category})=>({id,label,category}))},null,2)],{type:'application/json'}),'城市纯玩_动效参数.json');
 $('download').onclick=()=>{const expanded=engine.expanded,out=document.createElement('canvas');out.width=W*2;out.height=(H+(expanded?longPosterHeight(engine):0))*2;const ctx=out.getContext('2d');drawPoster(ctx,engine,2);if(expanded){ctx.save();ctx.translate(0,H*2);drawLongPoster(ctx,engine,2);ctx.restore()}out.toBlob(blob=>{if(blob){downloadBlob(blob,expanded?'城市纯玩_玩法长图.png':'城市纯玩_互动海报.png');toast(expanded?'已保存完整长图。':'已保存当前海报画面。')}else toast('导出失败，请重试。')},'image/png')};
 window.addEventListener('resize',fitPoster);if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitPoster).observe($('posterHost'));
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function frame(now){if(!lastFrame)lastFrame=now;const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;accumulator+=dt;let steps=0;while(accumulator>=1/120&&steps<12){engine.step(1/120);accumulator-=1/120;steps++}drawPoster($('canvas').getContext('2d'),engine,2);updateLongTyping(now);if(now-lastUI>100){updateUI();lastUI=now}requestAnimationFrame(frame)}
async function boot(){
 try{const payload=JSON.parse($('assets-data').textContent);let done=0;await Promise.all(Object.entries(payload).map(([id,url])=>new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(new Error('素材加载超时，请刷新重试')),20000);img.onload=()=>{clearTimeout(timer);images[id]=img;$('loading').textContent='正在载入素材 '+(++done)+' / '+Object.keys(payload).length;resolve()};img.onerror=()=>{clearTimeout(timer);reject(new Error('素材 '+id+' 无法读取'))};img.src=url})));
  const clean={...DEFAULTS};for(const defs of Object.values(CONTROLS))for(const [k,label,min,max]of defs)if(typeof saved[k]==='number'&&Number.isFinite(saved[k]))clean[k]=clamp(saved[k],min,max);for(const[k]of CHECKS)if(typeof saved[k]==='boolean')clean[k]=saved[k];if(['fan','jet','spiral','radial'].includes(saved.trajectory))clean.trajectory=saved.trajectory;clean.autoLayout=false;
  engine=new UrbanEngine(images,clean);const measureCanvas=document.createElement('canvas'),measureCtx=measureCanvas.getContext('2d');engine.measureText=(text,font)=>{measureCtx.font=font;return measureCtx.measureText(text).width};window.urbanPlay={engine,draw:()=>drawPoster($('canvas').getContext('2d'),engine,2),getState:()=>({state:engine.state,counts:engine.counts(),possible:engine.possible(),images:engine.bodies.map(b=>({word:b.item.label,count:b.item.count})),bodyCount:engine.bodies.length,collisions:engine.collisions}),reset:()=>engine.original()};engine.onChange=updateUI;engine.onCatch=playDrop;engine.onToast=toast;
  initControls();initMapping();initPosterControls();bindUI();initFontControls();loaded=true;$('loading').classList.add('hidden');for(const id of ['play','burst','original','download'])$(id).disabled=false;fitPoster();updateUI();requestAnimationFrame(frame);
 }catch(err){$('loading').textContent='素材加载失败：'+err.message;$('hint').textContent='请使用完整的 HTML 文件，素材已经内置。';console.error(err)}
}
function initFontControls(){
 const specs=[['fontSans','Poster PingFang',600],['fontSerif','Poster Source Han',900],['fontLatin','Poster DIN',900]];
 for(const [id,family,weight]of specs)$(id).addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;try{const face=new FontFace(family,await file.arrayBuffer(),{weight:String(weight)});await face.load();document.fonts.add(face);if(engine.expanded)renderLongPoster();$('fontStatus').textContent='已加载 '+file.name+'，本次打开有效。';toast('字体已应用。')}catch{$('fontStatus').textContent='字体未能加载，请选择 OTF、TTF 或 WOFF 字体。'}});
 if(document.fonts){document.fonts.addEventListener('loadingdone',()=>{if(engine.expanded)renderLongPoster()});Promise.allSettled([document.fonts.load('600 30px "Poster PingFang"'),document.fonts.load('900 30px "Poster Source Han"'),document.fonts.load('900 30px "Poster DIN"')]).then(()=>{if(engine.expanded)renderLongPoster()})}
}
boot();
