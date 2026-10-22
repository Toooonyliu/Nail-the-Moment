import {NailScene,DEFAULTS,PALETTE} from './nails.js?v=11';
import {HandCamera} from './tracking.js?v=11';
const $=id=>document.getElementById(id);
const paths={
 camera:'<path d="m8 5 1.5-2h5L16 5h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
 palette:'<path d="M20.7 13.8C23 6 16.3 2 11 3a9 9 0 0 0 1 18c2.8 0 3.4-1.4 2.1-3-1-1.3-.2-2.7 1.5-2.5 2.7.3 4.4.3 5.1-1.7Z"/><circle cx="7.4" cy="10.2" r=".8"/><circle cx="11" cy="6.8" r=".8"/><circle cx="16" cy="7.6" r=".8"/><circle cx="6.7" cy="14.7" r=".8"/>',
 length:'<path d="M12 3v18m-4-4 4 4 4-4M8 7l4-4 4 4M3 7v10M21 7v10"/>',
 soft:'<path d="M6 17V8a6 6 0 0 1 12 0v9c0 3-12 3-12 0Z"/><path d="M6 14c2-1.5 10-1.5 12 0"/>',
 round:'<path d="M6 16V8a6 6 0 0 1 12 0v8a6 5 0 0 1-12 0Z"/><path d="M6 13c2-1.5 10-1.5 12 0"/>',
 almond:'<path d="M6 9a6 6 0 0 1 12 0c0 7-6 12-6 12S6 16 6 9Z"/><path d="M6.3 12c2-1 9.4-1 11.4 0"/>',
 back:'<path d="m13 5-7 7 7 7M6 12h14"/>',
 gloss:'<circle cx="12" cy="12" r="8"/><path d="M7 12a5 5 0 0 1 5-5M17 3v4m-2-2h4"/>',
 matte:'<circle cx="12" cy="12" r="8"/><path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M10 16h.01M14 16h.01"/>',
 switch:'<path d="M3 7h15m-3-3 3 3-3 3M21 17H6m3-3-3 3 3 3"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const clamp=v=>Math.max(0,Math.min(1,v));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={...DEFAULTS};
let panel='home',side='right',scene,camera,busy=false,toastTimer,flowerTimer,flowerOpen=false,pressedButton=null;
const transitions=new WeakMap();
const menu=['color','length','shape','material'];
const names={base:{cherry:'Cherry',rose:'Rose',sky:'Sky blue',cream:'Cream',lavender:'Lavender'},shape:{soft:'Squoval',round:'Round',almond:'Almond'},material:{gloss:'Gloss',matte:'Matte'}};
const colors={cherry:'#b72e50',rose:'#d99fac',sky:'#9dcbd5',cream:'#e8d8bd',lavender:'#b5a0d5'};
$('startCamera').innerHTML=icon('camera');$('colorBtn').innerHTML=icon('palette');$('lengthBtn').innerHTML=icon('length');$('shapeBtn').innerHTML=icon('soft');$('materialBtn').innerHTML=icon('gloss');$('sideSwitch').innerHTML=icon('switch');

function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function pop(el,visible,{from='scale(.55)',delay=0,duration=350}={}){
  transitions.get(el)?.cancel();
  if(!visible&&el.hidden)return;
  if(visible){el.hidden=false;el.inert=false;el.style.pointerEvents='';}else{el.inert=true;el.style.pointerEvents='none';}
  if(reduced.matches){el.hidden=!visible;return;}
  const frames=visible?[
    {opacity:0,transform:from},
    {opacity:1,transform:'scale(1.07)',offset:.69},
    {opacity:1,transform:'scale(.988)',offset:.87},
    {opacity:1,transform:'none'}
  ]:[{opacity:1,transform:'none'},{opacity:0,transform:from}];
  const a=el.animate(frames,{duration:visible?duration:125,delay:visible?delay:0,easing:'cubic-bezier(.2,.75,.3,1)',fill:'both'});
  transitions.set(el,a);a.onfinish=()=>{if(transitions.get(el)!==a)return;el.hidden=!visible;a.cancel();transitions.delete(el);};
}
function pressRelease(button){
  if(reduced.matches||button.classList.contains('blossom-petal'))return;
  button.animate([{transform:'scale(.86)'},{transform:'scale(1.045)',offset:.65},{transform:'scale(.988)',offset:.85},{transform:'none'}],{duration:285,easing:'cubic-bezier(.2,.75,.3,1)'});
}
let bridgeSource=null;const changedKeys=new Set();
let textureFrame=0,lastTextureAt=0,pendingTextureKey='tone';
function flushTexture(now){
  if(now-lastTextureAt<32){textureFrame=requestAnimationFrame(flushTexture);return;}
  lastTextureAt=now;textureFrame=0;scene?.update(state,pendingTextureKey);
}
function update(key){
  changedKeys.add(key);
  if(bridgeSource){scene?.update(state,key);drawSliders();updateCore();parent.postMessage({type:"nail-ar-change",nails:scene?.design,keys:[...changedKeys]},location.origin);return;}
  if(key==='base'||key==='tone'){pendingTextureKey=key;if(!textureFrame)textureFrame=requestAnimationFrame(flushTexture);}
  else scene?.update(state,key);
  drawSliders();updateCore();
}

// Five single-colour petals. The uploaded nail artwork stays intact until a colour is chosen.
$('blossomPetals').innerHTML=Object.entries(colors).map(([key,paint],i)=>{
  const a=(-90+i*72)*Math.PI/180;
  return `<button class="blossom-petal" data-color="${key}" aria-label="Choose ${names.base[key]}" aria-pressed="false" tabindex="-1" style="--px:${Math.cos(a)*34}px;--py:${Math.sin(a)*34}px;--paint:${paint};--petal-delay:${i*24}ms;--fold-delay:${(4-i)*12}ms"></button>`;
}).join('');
function toneColor(t=state.tone){
  const c=PALETTE[state.base]||PALETTE.sky;
  const lightness=Math.max(.12,Math.min(.95,c[2]+(.5-t)*.56));
  return `hsl(${c[0]*360} ${c[1]*100}% ${lightness*100}%)`;
}
function updateCore(){
  const core=$('blossomCore');
  core.innerHTML=`<i class="blossom-core-paint" style="background:${toneColor()}"></i>`;
  core.setAttribute('aria-label',`${flowerOpen?'Collapse ':'Expand '}colors, current ${names.base[state.base]||'Original'}`);
  $('blossomPetals').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===state.base)));
}
function setFlower(open,{delay=0}={}){
  clearTimeout(flowerTimer);flowerOpen=open;$('blossomCore').setAttribute('aria-expanded',String(open));updateCore();
  const apply=()=>{
    if(panel!=='color')return;
    $('blossomPicker').dataset.open=String(open);$('blossomPetals').inert=!open;
    $('blossomPetals').setAttribute('aria-hidden',String(!open));
    $('blossomPetals').querySelectorAll('button').forEach(b=>b.tabIndex=open?0:-1);
  };
  if(delay&&!reduced.matches)flowerTimer=setTimeout(apply,delay);else apply();
}
$('blossomCore').addEventListener('click',()=>setFlower(!flowerOpen));
$('blossomPetals').addEventListener('click',e=>{
  const b=e.target.closest('[data-color]');if(!b)return;
  state.base=b.dataset.color;update('base');
  // Selection is immediate; flower and short slider remain visible together.
  if(!reduced.matches)$('blossomCore').animate([{transform:'scale(.9)'},{transform:'scale(1.045)',offset:.65},{transform:'none'}],{duration:240,easing:'ease-out'});
});

// A 110-degree arc: visibly shorter than a semicircle, with space around the flower.
const ARC={c:110,r:86,start:125,sweep:110};
const arcPoint=t=>{const a=(ARC.start+ARC.sweep*t)*Math.PI/180;return{x:ARC.c+Math.cos(a)*ARC.r,y:ARC.c+Math.sin(a)*ARC.r};};
const start=arcPoint(0),end=arcPoint(1),path=`M${start.x} ${start.y} A${ARC.r} ${ARC.r} 0 0 1 ${end.x} ${end.y}`;
const sliders=[{id:'colorSlider',key:'tone',gain:.55},{id:'lengthSlider',key:'length',gain:.8}];
let gradientBase='';
function drawSliders(){
  const key=panel==='color'?'tone':'length';
  $('stepLabel').textContent=`${key==='tone'?'Tone':'Length'} ${Math.round(state[key]*100)}%`;
  for(const slider of sliders){
    const svg=$(slider.id),v=state[slider.key],p=arcPoint(v),knob=svg.querySelector('.arc-knob');
    knob.setAttribute('cx',p.x);knob.setAttribute('cy',p.y);svg.setAttribute('aria-valuenow',String(Math.round(v*100)));svg.setAttribute('aria-valuetext',`${Math.round(v*100)}%`);
    if(slider.key==='tone'){
      knob.style.fill=toneColor();
      if(gradientBase!==state.base){
        gradientBase=state.base;let markup='';
        for(let i=0;i<44;i++){const t=i/44,a=arcPoint(t),b=arcPoint(Math.min(1,(i+1.02)/44));markup+=`<path d="M${a.x} ${a.y} A86 86 0 0 1 ${b.x} ${b.y}" fill="none" stroke="${toneColor(t)}" stroke-width="16"/>`;}
        for(const t of [0,1]){const a=arcPoint(t);markup+=`<circle cx="${a.x}" cy="${a.y}" r="8" fill="${toneColor(t)}"/>`;}
        svg.querySelector('.arc-segments').innerHTML=markup;
      }
    }else{
      const progress=svg.querySelector('.arc-progress'),length=ARC.r*ARC.sweep*Math.PI/180;
      progress.style.strokeDasharray=String(length);progress.style.strokeDashoffset=String(length*(1-v));
    }
  }
}
function pointerAngle(svg,e){
  const rect=svg.getBoundingClientRect();let x=(e.clientX-rect.left)*220/rect.width;
  if(side==='left')x=220-x;
  const y=(e.clientY-rect.top)*220/rect.height,dx=x-110,dy=y-110;
  let degrees=Math.atan2(dy,dx)*180/Math.PI;if(degrees<0)degrees+=360;
  return{degrees,radius:Math.hypot(dx,dy)};
}
for(const slider of sliders){
  const svg=$(slider.id);svg.querySelector('.arc-track').setAttribute('d',path);svg.querySelector('.arc-hit').setAttribute('d',path);svg.querySelector('.arc-progress')?.setAttribute('d',path);
  let drag=null;
  svg.addEventListener('pointerdown',e=>{
    const a=pointerAngle(svg,e);
    if(Math.abs(a.radius-86)>29||a.degrees<109||a.degrees>251)return;
    e.preventDefault();drag={pointerId:e.pointerId,last:a.degrees};svg.classList.add('is-dragging');svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove',e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    const a=pointerAngle(svg,e);let delta=a.degrees-drag.last;if(delta>180)delta-=360;if(delta< -180)delta+=360;
    drag.last=a.degrees;
    // Relative movement prevents jumps on touch-down. Lower gain gives the short colour arc resistance.
    const step=Math.max(-.16,Math.min(.16,delta/110))*slider.gain;
    state[slider.key]=clamp(state[slider.key]+step);update(slider.key);
  });
  const release=()=>{drag=null;svg.classList.remove('is-dragging');};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,release);
  svg.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key))return;
    e.preventDefault();state[slider.key]=e.key==='Home'?0:e.key==='End'?1:clamp(state[slider.key]+(['ArrowUp','ArrowRight'].includes(e.key)?.02:-.02));update(slider.key);
  });
}
function renderChoices(){
  const key=panel==='shape'?'shape':'material',values=key==='shape'?['soft','round','almond']:['gloss','matte'];
  const positions=[[0,-112],[-97,-56],[-97,56]];
  $('choicePanel').setAttribute('aria-label',key==='shape'?'Nail shape':'Nail finish');
  $('choicePanel').innerHTML=values.map((v,i)=>`<button class="choice-button option" data-option="${v}" data-key="${key}" aria-label="${names[key][v]}" aria-pressed="${state[key]===v}" style="--x:${positions[i][0]}px;--y:${positions[i][1]}px">${icon(v)}</button>`).join('');
}
$('choicePanel').addEventListener('click',e=>{
  const b=e.target.closest('[data-option]');if(!b)return;
  const key=b.dataset.key;state[key]=b.dataset.option;update(key);
  $('choicePanel').querySelectorAll('[data-option]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));
  $(key==='shape'?'shapeBtn':'materialBtn').innerHTML=icon(state[key]);
  if(!reduced.matches)b.firstElementChild?.animate([{transform:'scale(.8)'},{transform:'scale(1.06)',offset:.7},{transform:'none'}],{duration:250,easing:'ease-out'});
});
function setPanel(next){
  const previous=panel;panel=next;$('app').dataset.panel=next;
  clearTimeout(flowerTimer);flowerOpen=false;$('blossomPicker').dataset.open='false';$('blossomPetals').inert=true;
  const menuVisible=next==='menu',editing=!['home','menu'].includes(next),delay=140;
  menu.forEach((name,i)=>{
    const b=$(name+'Btn');
    const dx=-Number(getComputedStyle(b).getPropertyValue('--x').replace('px',''))*.65;
    const dy=-Number(getComputedStyle(b).getPropertyValue('--y').replace('px',''))*.65;
    pop(b,menuVisible,{from:`translate(${side==='left'?-dx:dx}px,${dy}px) scale(.4)`,delay:menuVisible?delay+i*35:0});
  });
  pop($('sideSwitch'),next==='home',{delay:next==='home'?150:0});
  pop($('colorPanel'),next==='color',{from:'scale(.82)',delay:editing?140:0,duration:310});
  pop($('lengthPanel'),next==='length',{from:'scale(.82)',delay:editing?140:0,duration:310});
  if(next==='shape'||next==='material'){
    renderChoices();$('choicePanel').hidden=false;$('choicePanel').inert=false;
    $('choicePanel').querySelectorAll('button').forEach((b,i)=>pop(b,true,{delay:145+i*38}));
  }else{$('choicePanel').hidden=true;$('choicePanel').inert=true;}
  if(next==='color')setFlower(true,{delay:185});
  $('mainBtn').innerHTML=next==='home'?'<span>DIY</span>':icon('back');
  $('mainBtn').setAttribute('aria-label',next==='home'?'Open DIY':next==='menu'?'Back to preview':'Back to DIY menu');
  $('stepControls').hidden=!['color','length'].includes(next);
  $('stepDown').setAttribute('aria-label',next==='color'?'Decrease color tone':'Decrease nail length');
  $('stepUp').setAttribute('aria-label',next==='color'?'Increase color tone':'Increase nail length');
  if(previous!==next&&!reduced.matches)$('mainBtn').firstElementChild?.animate([{opacity:.4,transform:'scale(.75)'},{opacity:1,transform:'none'}],{duration:200,easing:'ease-out'});
  drawSliders();updateCore();
}
for(const [id,delta] of [['stepDown',-.02],['stepUp',.02]])$(id).addEventListener('click',()=>{const key=panel==='color'?'tone':'length';state[key]=clamp(state[key]+delta);update(key);});
$('mainBtn').addEventListener('click',()=>setPanel(panel==='home'?'menu':panel==='menu'?'home':'menu'));
menu.forEach(name=>$(name+'Btn').addEventListener('click',()=>setPanel(name)));
$('sideSwitch').addEventListener('click',()=>{
  side=side==='right'?'left':'right';$('app').dataset.side=side;
  const label=side==='right'?'Switch controls to left':'Switch controls to right';$('sideSwitch').setAttribute('aria-label',label);$('sideSwitch').title=label;
  if(!reduced.matches)$('sideSwitch').firstElementChild.animate([{transform:'rotate(0deg)'},{transform:'rotate(180deg)'}],{duration:330,easing:'cubic-bezier(.22,1,.36,1)'});
});
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;pressedButton=b;b.classList.add('is-pressed');});
function endPress(){if(!pressedButton)return;const b=pressedButton;pressedButton=null;b.classList.remove('is-pressed');pressRelease(b);}
window.addEventListener('pointerup',endPress);window.addEventListener('pointercancel',()=>{pressedButton?.classList.remove('is-pressed');pressedButton=null;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel!=='home'){e.preventDefault();setPanel(panel==='menu'?'home':'menu');}});

function cameraError(e){
  busy=false;camera?.stop();$('camera').classList.remove('active');$('stage').removeAttribute('aria-busy');$('startCamera').hidden=false;$('startCamera').disabled=false;scene?.cameraMode(true);
  const messages={NotAllowedError:'Allow camera access in browser settings, then tap to retry.',NotFoundError:'No camera found. Open this preview on your phone.',NotReadableError:'Camera is in use. Close the other app and retry.',InsecureContext:'Open the camera preview over HTTPS or localhost.'};
  const message=messages[e?.name]||'Camera could not start. Tap the camera icon to retry.';toast(message);parent.postMessage({type:'nail-ar-camera-state',state:'error',message},location.origin);console.error('Camera:',e);
}
async function startCamera(){if(busy||!scene?.ready)return;busy=true;$('toast').hidden=true;$('startCamera').disabled=true;try{await camera.start();}catch(e){cameraError(e);}}
$('startCamera').addEventListener('click',startCamera);window.addEventListener('pagehide',()=>camera?.stop());
async function initialize(){
  try{
    scene=new NailScene($('renderMount'));scene.cameraMode(true);await scene.setSource('./assets/cherry-reference.png');
    camera=new HandCamera($('camera'),(landmarks,w,h)=>scene.track(landmarks,w,h),status=>{
      if(status==='loading'){parent.postMessage({type:'nail-ar-camera-state',state:'loading'},location.origin);$('camera').classList.add('active');$('startCamera').hidden=true;$('stage').setAttribute('aria-busy','true');}
      if(status==='ready'){parent.postMessage({type:'nail-ar-camera-state',state:'ready'},location.origin);busy=false;$('stage').removeAttribute('aria-busy');}
      if(status==='error'||status==='ended')cameraError(new Error(status));
    });
    parent.postMessage({type:'nail-ar-ready'},location.origin);
    const local=['localhost','127.0.0.1'].includes(location.hostname);
    if(new URLSearchParams(location.search).get('camera')==='off'){scene.cameraMode(false);return;}
    await startCamera();
  }catch(e){cameraError(e);}
}
setPanel('home');initialize();

window.addEventListener('message',e=>{
  if(e.source!==parent||e.origin!==location.origin||!scene)return;
  if(e.data?.type==='nail-ar-design'&&Array.isArray(e.data.nails)&&e.data.nails.length===5){
    bridgeSource=structuredClone(e.data.nails);changedKeys.clear();
    state.length=bridgeSource[0].length;state.shape=bridgeSource[0].shape==='round'?'round':bridgeSource[0].shape==='almond'?'almond':'soft';state.material=bridgeSource[0].finish==='matte'?'matte':'gloss';
    scene.referenceColors=bridgeSource.map(n=>n.color);scene.setDesign(bridgeSource);drawSliders();
  }
  if(e.data?.type==='nail-ar-capture'){
    const video=$('camera'),c=document.createElement('canvas');c.width=scene.w;c.height=scene.h;const ctx=c.getContext('2d');ctx.fillStyle='#161616';ctx.fillRect(0,0,c.width,c.height);
    if(video.readyState>=2){const scale=Math.max(c.width/video.videoWidth,c.height/video.videoHeight);ctx.drawImage(video,(c.width-video.videoWidth*scale)/2,(c.height-video.videoHeight*scale)/2,video.videoWidth*scale,video.videoHeight*scale);}
    scene.renderer.render(scene.scene,scene.camera);ctx.drawImage(scene.renderer.domElement,0,0,c.width,c.height);parent.postMessage({type:'nail-ar-capture',image:c.toDataURL('image/png')},location.origin);
  }
});
window.addEventListener('pagehide',()=>{camera?.stop();camera?.detector?.close();scene?.dispose();cancelAnimationFrame(textureFrame);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)camera?.stop();});
