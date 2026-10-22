import * as THREE from './assets/three.module.js';

export const DEFAULT_CROPS = [
  {x:94,y:68,w:187,h:332}, {x:330,y:106,w:141,h:255},
  {x:515,y:100,w:169,h:275}, {x:707,y:132,w:149,h:252}, {x:881,y:158,w:145,h:231}
];
export const DEFAULTS={base:'original',tone:.5,material:'gloss',shape:'soft',length:.46,width:1,offset:0};
export const PALETTE={cherry:[.966,.66,.43],rose:[.96,.33,.72],sky:[.53,.4,.7],cream:[.09,.35,.83],lavender:[.73,.38,.72]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function coverPoint(p,vw,vh,w,h){const s=Math.max(w/vw,h/vh);return {x:p.x*vw*s-(vw*s-w)/2,y:p.y*vh*s-(vh*s-h)/2,z:(p.z||0)*vw*s};}

function makeGeometry(shape){
  const positions=[],uvs=[],indices=[],rows=40,cols=24;
  for(let r=0;r<=rows;r++){
    const t=r/rows;
    let width=.5;
    if(t<.16) width*=Math.sqrt(Math.max(.0008,1-Math.pow((.16-t)/.16,2)));
    if(shape==='round'&&t>.77) width*=Math.sqrt(Math.max(.0008,1-Math.pow((t-.77)/.23,2)));
    else if(shape==='almond'&&t>.4) width*=Math.pow(Math.max(.006,1-(t-.4)/.6),.68);
    else if(t>.94) width*=1-.14*Math.pow((t-.94)/.06,2);
    if(shape==='soft')width*=1-.08*t;
    for(let c=0;c<=cols;c++){
      const q=c/cols*2-1;
      positions.push(q*width,t-.5,.145*(1-q*q)+.018*Math.sin(t*Math.PI));
      uvs.push(c/cols,t);
      if(r<rows&&c<cols){const i=r*(cols+1)+c;indices.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1);}
    }
  }
  // A slim rim makes the edge read as an actual curved nail rather than a flat card.
  const edge=[];for(let c=0;c<=cols;c++)edge.push(c);for(let r=1;r<=rows;r++)edge.push(r*(cols+1)+cols);for(let c=cols-1;c>=0;c--)edge.push(rows*(cols+1)+c);for(let r=rows-1;r>0;r--)edge.push(r*(cols+1));
  for(let k=0;k<edge.length;k++){
    const a=edge[k],b=edge[(k+1)%edge.length],n=positions.length/3;
    for(const j of [a,b]){positions.push(positions[j*3],positions[j*3+1],positions[j*3+2]-.027);uvs.push(uvs[j*2],uvs[j*2+1]);}
    indices.push(a,n,b,b,n,n+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;let max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2,d=max-min;if(d){s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h/=6;}return[h,s,l];}
function hslToRgb(h,s,l){let a=s*Math.min(l,1-l),f=n=>{let k=(n+h*12)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};return[f(0)*255,f(8)*255,f(4)*255];}

export class NailScene{
  constructor(mount){
    this.mount=mount;this.state={...DEFAULTS};this.ready=false;this.isCamera=false;this.hasHand=false;this.frozen=false;this.lastSeen=0;this.previewDrag=0;
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.92;mount.append(this.renderer.domElement);
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2000);this.camera.position.z=1000;
    this.scene.add(new THREE.AmbientLight(0xffffff,1.55));
    const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-200,350,600);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xd8e8ff,1.4);fill.position.set(300,-100,300);this.scene.add(fill);
    // Studio strips provide a soft reflection over the curved surface.
    const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const ec=envCanvas.getContext('2d');ec.fillStyle='#7e8581';ec.fillRect(0,0,512,256);ec.fillStyle='#f7faf8';ec.fillRect(60,20,28,200);ec.fillRect(280,45,75,155);const envTex=new THREE.CanvasTexture(envCanvas);envTex.mapping=THREE.EquirectangularReflectionMapping;envTex.colorSpace=THREE.SRGBColorSpace;this.scene.environment=envTex;
    this.geometry=makeGeometry('soft');this.nails=Array.from({length:5},()=>{
      const group=new THREE.Group(),material=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.24,metalness:.03,clearcoat:1,clearcoatRoughness:.11,side:THREE.DoubleSide,envMapIntensity:.3});
      const mesh=new THREE.Mesh(this.geometry,material);group.add(mesh);this.scene.add(group);return{group,mesh,material,hasPose:false};
    });
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(mount);this.resize();
    let drag=null;mount.addEventListener('pointerdown',e=>{if(this.isCamera)return;drag={x:e.clientX,value:this.previewDrag};mount.setPointerCapture(e.pointerId)});mount.addEventListener('pointermove',e=>{if(drag)this.previewDrag=drag.value+(e.clientX-drag.x)*.009});mount.addEventListener('pointerup',()=>drag=null);mount.addEventListener('pointercancel',()=>drag=null);
    this.animate=this.animate.bind(this);this.raf=requestAnimationFrame(this.animate);
  }
  resize(){this.w=this.mount.clientWidth;this.h=this.mount.clientHeight;this.renderer.setSize(this.w,this.h);Object.assign(this.camera,{left:-this.w/2,right:this.w/2,top:this.h/2,bottom:-this.h/2});this.camera.updateProjectionMatrix();}
  async setSource(url,crops=DEFAULT_CROPS){
    const image=new Image();image.src=url;await image.decode();this.source=image;this.crops=crops;const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);this.sourceData=ctx.getImageData(0,0,canvas.width,canvas.height);this.baseTextures=crops.map((c,i)=>this.extract(c,i));this.refreshTextures();this.ready=true;
  }
  extract(crop,index){
    const sz=256,result=new Uint8ClampedArray(sz*sz*4),src=this.sourceData.data,iw=this.sourceData.width,ih=this.sourceData.height;
    const rowBounds=[];
    for(let py=0;py<sz;py++){
      const t=1-py/(sz-1),sy=clamp(Math.round(crop.y+t*(crop.h-1)),0,ih-1);let left=-1,right=-1;
      const minX=Math.max(0,Math.floor(crop.x)),maxX=Math.min(iw-1,Math.floor(crop.x+crop.w));
      for(let x=minX;x<=maxX;x++){const p=(sy*iw+x)*4,r=src[p],g=src[p+1],b=src[p+2];if(Math.max(r,g,b)-Math.min(r,g,b)>26){if(left<0)left=x;right=x;}}
      if(left<0||right-left<crop.w*.08){const f=t<.13?Math.sqrt(Math.max(.02,1-Math.pow((.13-t)/.13,2))):1;left=crop.x+crop.w*(.5-.47*f);right=crop.x+crop.w*(.5+.47*f);}
      rowBounds.push([left+2,right-2,sy]);
    }
    for(let py=0;py<sz;py++){
      let l=0,r=0,count=0;for(let k=Math.max(0,py-2);k<=Math.min(sz-1,py+2);k++){l+=rowBounds[k][0];r+=rowBounds[k][1];count++;}l/=count;r/=count;
      for(let px=0;px<sz;px++){const sx=clamp(Math.round(l+(r-l)*px/(sz-1)),0,iw-1),s=(rowBounds[py][2]*iw+sx)*4,d=(py*sz+px)*4;result[d]=src[s];result[d+1]=src[s+1];result[d+2]=src[s+2];result[d+3]=255;}
    }
    let red=0,blue=0;for(let i=0;i<result.length;i+=16){if(result[i]>result[i+1]*1.3)red++;else if(result[i+2]>result[i]*1.08)blue++;}
    return{data:result,size:sz,dominant:red>blue?'red':'blue'};
  }
  refreshTextures(){if(!this.baseTextures)return;const s=this.state;
    this.baseTextures.forEach((base,index)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=base.size;const ctx=canvas.getContext('2d'),data=new Uint8ClampedArray(base.data);
      for(let i=0;i<data.length;i+=4){let[h,sat,l]=rgbToHsl(data[i],data[i+1],data[i+2]);const isRed=(h<.07||h>.9)&&sat>.3;
        // Protect red cherry / heart motifs on blue nails and preserve specular highlights.
        const protect=(base.dominant==='blue'&&isRed)||(sat<.12&&l>.76);
        if(!protect){if(s.base!=='original'){const p=PALETTE[s.base];h=p[0];sat=p[1]*(.65+sat*.55);l=clamp(l*.68+p[2]*.32,0,1);}l=clamp(l+(s.tone-.5)*-.52,0,1);const rgb=hslToRgb(h,sat,l);data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];}
      }
      ctx.putImageData(new ImageData(data,base.size,base.size),0,0);
      const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());const mat=this.nails[index].material;mat.map?.dispose();mat.map=tex;mat.needsUpdate=true;
    });
  }
  setDesign(nails){
    this.design=structuredClone(nails);
    this.nails.forEach((n,i)=>{
      const d=nails[i];if(!d)return;
      const old=n.mesh.geometry;n.mesh.geometry=makeGeometry(d.shape==='square'?'soft':d.shape==='coffin'?'almond':d.shape);if(old!==this.geometry)old.dispose();
      const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=d.color;ctx.fillRect(0,0,256,256);
      if(d.pattern==='french'){ctx.fillStyle=d.accentColor||'#fffaf0';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(256,0);ctx.lineTo(256,65);ctx.quadraticCurveTo(128,140,0,65);ctx.fill();}
      if(d.pattern==='swirl'){ctx.strokeStyle=d.accentColor||'#372425';ctx.lineWidth=24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-20,180);ctx.bezierCurveTo(200,260,40,20,280,60);ctx.stroke();}
      for(const e of d.elements||[]){ctx.save();ctx.translate(128+e.x*256,128-e.y*256);ctx.rotate(-e.rotation*Math.PI/180);ctx.fillStyle=e.color;ctx.font=`${45*(e.scale||1)}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(({star:'★',heart:'♥',flower:'✿',pearl:'●'})[e.kind]||'●',0,0);ctx.restore();}
      // Mesh UV t increases toward the free edge; canvas rows start at the tip.
      n.material.map?.dispose();n.material.map=new THREE.CanvasTexture(c);n.material.map.colorSpace=THREE.SRGBColorSpace;
      n.material.color.set('#ffffff');n.material.roughness=d.finish==='matte'?.98:.22;n.material.clearcoat=d.finish==='matte'?0:1;n.material.metalness=0;n.material.needsUpdate=true;
    });this.ready=true;
  }
  update(state,changed){this.state={...state};
    if(this.design){
      const colors={cherry:'#b72e50',rose:'#d99fac',sky:'#9dcbd5',cream:'#e8d8bd',lavender:'#b5a0d5'};
      this.design=this.design.map((d,i)=>{
        const next={...d};
        if(changed==='base'||changed==='tone'){const color=new THREE.Color(colors[state.base]||this.referenceColors?.[i]||d.color);const hsl={};color.getHSL(hsl);hsl.l=clamp(hsl.l+(.5-state.tone)*.56,.08,.95);color.setHSL(hsl.h,hsl.s,hsl.l);next.color='#'+color.getHexString();}
        if(changed==='length')next.length=state.length;
        if(changed==='shape')next.shape=state.shape==='soft'?'square':state.shape;
        if(changed==='material')next.finish=state.material;
        return next;
      });this.setDesign(this.design);return;
    }if(['base','tone','all'].includes(changed))this.refreshTextures();if(['shape','all'].includes(changed)){const old=this.geometry;this.geometry=makeGeometry(state.shape);this.nails.forEach(n=>n.mesh.geometry=this.geometry);old.dispose();}
    if(['material','all'].includes(changed))this.nails.forEach(({material:m})=>{
      const matte=state.material==='matte';m.roughness=matte?.98:.22;m.clearcoat=matte?0:1;
      m.metalness=matte?0:.03;m.specularIntensity=matte?.18:1;m.envMapIntensity=matte?.08:.4;m.needsUpdate=true;
    });
  }
  cameraMode(active){this.isCamera=active;this.hasHand=false;this.frozen=false;this.nails.forEach(n=>{n.hasPose=false;n.group.visible=!active;});}
  track(landmarks,vw,vh){
    if(!landmarks){this.hasHand=false;return;}
    this.hasHand=true;this.lastSeen=performance.now();const p=landmarks.map(l=>coverPoint(l,vw,vh,this.w,this.h));
    const palmWidth=Math.hypot(p[5].x-p[17].x,p[5].y-p[17].y);
    const s=this.state,tips=[4,8,12,16,20];
    tips.forEach((tip,i)=>{
      const a=p[tip-1],b=p[tip],n=this.nails[i],dx=b.x-a.x,dy=b.y-a.y,segment=Math.max(8,Math.hypot(dx,dy)),ux=dx/segment,uy=dy/segment;
      const width=clamp(palmWidth*[.25,.193,.203,.185,.151][i],segment*.42,segment*1.04)*s.width;
      const length=segment*(.72+(this.design?.[i]?.length??s.length)*.82);
      // Anchor the cuticle before the fingertip; increasing length grows outward.
      const baseX=b.x-ux*segment*.79,baseY=b.y-uy*segment*.79;
      const cx=baseX+ux*(length*.5+s.offset*segment),cy=baseY+uy*(length*.5+s.offset*segment);
      const target=new THREE.Vector3(cx-this.w/2,this.h/2-cy,10+i*2);
      const angle=Math.atan2(-dy,dx)-Math.PI/2;
      const slope=clamp(-(b.z-a.z)/Math.max(1,segment),-.65,.65);
      const quat=new THREE.Quaternion().setFromEuler(new THREE.Euler(slope,0,angle,'ZYX'));
      if(!n.hasPose){n.group.position.copy(target);n.group.quaternion.copy(quat);n.group.scale.set(width,length,width);n.hasPose=true;}
      else{n.group.position.lerp(target,.58);n.group.quaternion.slerp(quat,.5);n.group.scale.lerp(new THREE.Vector3(width,length,width),.5);}
      // Strongly folded fingers are hidden to reduce nails floating over the palm.
      const prior=p[tip-2],vx=a.x-prior.x,vy=a.y-prior.y,cos=(vx*dx+vy*dy)/(Math.hypot(vx,vy)*segment||1);
      n.group.visible=cos>-.15;
    });
  }
  dispose(){cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.nails.forEach(n=>{n.mesh.geometry.dispose();n.material.map?.dispose();n.material.dispose();});this.geometry.dispose();this.scene.environment?.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
  animate(time){this.raf=requestAnimationFrame(this.animate);if(document.hidden)return;if(!this.ready)return;
    if(!this.isCamera){const usable=this.h-215,centerY=this.h/2-(100+Math.max(82,usable*.52));const spacing=this.w*.165;this.nails.forEach((n,i)=>{n.group.visible=true;n.group.position.set((i-2)*spacing,centerY+Math.sin(i*.9)*12,0);const width=this.w*.118*(i===0?1.08:i===4?.83:1),length=width*(1.52+(this.design?.[i]?.length??this.state.length)*.8);n.group.scale.set(width,length,width);n.group.rotation.set(-.16+Math.sin(time*.00045+i*.5)*.08,Math.sin(time*.00055+i*.5)*.18+this.previewDrag,(i-2)*-.045);});}
    else if(!this.frozen&&!this.hasHand&&time-this.lastSeen>180)this.nails.forEach(n=>{n.group.visible=false;n.hasPose=false;});
    this.renderer.render(this.scene,this.camera);
  }
}
