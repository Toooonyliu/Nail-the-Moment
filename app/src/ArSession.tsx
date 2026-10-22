import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, DownloadSimple, X } from '@phosphor-icons/react';
import { BottomSheet, useKeyboard } from './mobile';
import HandScene, { type NailAppearance } from './HandScene';
import { mergeArAdjustments } from './ar-design';
import type { StudioProject } from './studio-data';

export default function ArSession({project,mode,skinTone,handedness,onSavePhoto,onClose,onApply}:{project:StudioProject;mode:'camera'|'controls';skinTone:string;handedness:'left'|'right';onSavePhoto:(image:string)=>void;onClose:()=>void;onApply:(nails:NailAppearance[])=>void}) {
  const keyboard=useKeyboard();
  const frame=useRef<HTMLIFrameElement>(null);
  const draft=useRef<NailAppearance[]|null>(null);
  const cameraLive=useRef(false);
  const [edited,setEdited]=useState<NailAppearance[]|null>(null);
  const [shot,setShot]=useState('');
  const [shotSaved,setShotSaved]=useState(false);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const [controlsOnly,setControlsOnly]=useState(mode==='controls');
  const [cameraReady,setCameraReady]=useState(false),[cameraError,setCameraError]=useState('');
  const [exitOpen,setExitOpen]=useState(false);
  useEffect(()=>{
    const timer=setTimeout(()=>setError('Preview is taking longer to load. Go back and try again.'),20000);
    function receive(e:MessageEvent) {
      if(e.source!==frame.current?.contentWindow||e.origin!==location.origin)return;
      if(e.data?.type==='nail-ar-ready') {
        clearTimeout(timer);setReady(true);setError('');
        frame.current?.contentWindow?.postMessage({type:'nail-ar-design',nails:draft.current??project.nails},location.origin);
      }
      if(e.data?.type==='nail-ar-camera-state') {
        cameraLive.current=e.data.state==='ready';setCameraReady(cameraLive.current);
        setCameraError(e.data.state==='error'?String(e.data.message||'Camera could not start.'):'');
      }
      if(e.data?.type==='nail-ar-change'&&Array.isArray(e.data.nails)&&e.data.nails.length===5) {
        const keys:string[]=e.data.keys||[],base=draft.current??project.nails;
        const nails=mergeArAdjustments(base,e.data.nails,keys);
        draft.current=nails;setEdited(nails);
      }
      if(!controlsOnly&&cameraLive.current&&e.data?.type==='nail-ar-capture'&&typeof e.data.image==='string'&&e.data.image.startsWith('data:image/png')){setShot(e.data.image);setShotSaved(false);}
    }
    window.addEventListener('message',receive);
    return()=>{clearTimeout(timer);window.removeEventListener('message',receive);};
  },[project,controlsOnly]);
  function leave(){keyboard.hide();if(edited)setExitOpen(true);else onClose();}
  return <>
    <div className={`v2-ar-session ${controlsOnly?'is-controls':''}`} inert={exitOpen}>
      {controlsOnly&&<div className="v3-ar-model"><HandScene nails={edited??project.nails} skinTone={skinTone} handedness={handedness} selectedNail={null} interactive={false} pose="relaxed"/></div>}
      <iframe ref={frame} src={`/ar/index.html${controlsOnly?'?camera=off&shared=1':''}`} title={controlsOnly?'Nail controls preview, camera off':'Live camera nail preview'} allow="camera; fullscreen"/>
      <header><button aria-label="Return to Studio" onClick={leave}><ArrowLeft size={21}/><span>Studio</span></button>{controlsOnly&&<span className="v2-camera-off">Controls preview · camera off</span>}</header>
      <p className="v2-ar-scope">Edits affect all five nails</p>
      {!ready&&!error&&<div className="v2-ar-loading" role="status">Loading try-on…</div>}
      {error&&<div className="v2-ar-loading" role="alert">{error}<button onClick={leave}>Back to Studio</button></div>}
      {cameraError&&!controlsOnly&&<div className="v2-ar-camera-error" role="alert"><p>{cameraError}</p><button onClick={()=>{setReady(false);setCameraError('');setCameraReady(false);setControlsOnly(true);}}>Explore controls without camera</button></div>}
      <div className="v2-ar-host-actions">
        {!controlsOnly&&cameraReady&&<button aria-label="Capture AR reference" onClick={()=>frame.current?.contentWindow?.postMessage({type:'nail-ar-capture'},location.origin)}><Camera size={19}/></button>}
        {edited&&<button className="v2-ar-apply" onClick={()=>onApply(edited)}><Check size={18}/>Use changes</button>}
      </div>
      {shot&&<div className="v2-ar-shot"><button aria-label="Close captured reference" onClick={()=>setShot('')}><X size={22}/></button><img src={shot} alt="Captured AR reference"/><button className="v4-save-camera-photo" disabled={shotSaved} onClick={()=>{if(!controlsOnly&&cameraReady){onSavePhoto(shot);setShotSaved(true);}}}><Check size={19}/>{shotSaved?'Saved to My try-ons':'Save to My try-ons'}</button><a href={shot} download="nail-the-moment-ar-reference.png"><DownloadSimple size={19}/>Save reference image</a></div>}
    </div>
    <BottomSheet open={exitOpen} onOpenChange={setExitOpen} title="Keep your AR adjustments?" snap={.55}>
      <div className="nm-sheet v2-ar-exit"><p>Apply these adjustments to Studio, or discard this preview’s changes. Your saved design stays intact.</p><button className="nm-button aqua" onClick={()=>{if(edited)onApply(edited);}}><span>Use changes &amp; return</span></button><button className="nm-text-button" onClick={onClose}>Discard AR changes</button><button className="nm-text-button" onClick={()=>setExitOpen(false)}>Keep previewing</button></div>
    </BottomSheet>
  </>;
}
