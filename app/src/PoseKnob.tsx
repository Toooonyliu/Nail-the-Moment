import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowCounterClockwise, HandPalm, X } from '@phosphor-icons/react';
import { poseOptions, type HandPose } from './hand-poses';

/** Press, drag and release selects a pose; a tap opens the same choices. */
export default function PoseKnob({ pose, onChange, onOpen, onReset }: { pose: HandPose; onChange: (pose: HandPose) => void; onOpen: () => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<HandPose | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean; wasOpen: boolean } | null>(null);
  const poseLabel = pose === 'fan' ? 'Open' : poseOptions.find(p => p.id === pose)?.label;
  useEffect(() => {
    if (!open) return;
    const outside = (event: globalThis.PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function choose(id: HandPose, focus = false) { onChange(id); setOpen(false); setHover(null); if (focus) trigger.current?.focus({ preventScroll: true }); }
  function hit(x: number, y: number) {
    return poseOptions.find(p => {
      const rect = root.current?.querySelector(`[data-pose="${p.id}"]`)?.getBoundingClientRect();
      return rect && x >= rect.left - 7 && x <= rect.right + 7 && y >= rect.top - 7 && y <= rect.bottom + 7;
    })?.id ?? null;
  }
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); onOpen();
    gesture.current = { x: event.clientX, y: event.clientY, moved: false, wasOpen: open };
    setOpen(true); setHover(null); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const session = gesture.current; if (!session) return;
    if (Math.hypot(event.clientX - session.x, event.clientY - session.y) > 8) session.moved = true;
    if (session.moved) setHover(hit(event.clientX, event.clientY));
  }
  function finish(event: PointerEvent<HTMLButtonElement>) {
    const session = gesture.current; gesture.current = null; if (!session) return;
    if (event.type === 'pointercancel') { setOpen(false); setHover(null); return; }
    const target = session.moved ? hit(event.clientX, event.clientY) : null;
    if (target) choose(target);
    else if (session.moved || session.wasOpen) { setOpen(false); setHover(null); }
  }
  return <div ref={root} className={`v4-pose-knob ${open ? 'is-open' : ''}`} data-pose-count={poseOptions.length} data-scroll-drag="ignore" onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); setHover(null); trigger.current?.focus(); }
  }}>
    <button className="v8-pose-reset" aria-label="Reset to Open and center hand" onClick={() => { gesture.current = null; setOpen(false); setHover(null); onReset(); trigger.current?.focus({ preventScroll: true }); }}><ArrowCounterClockwise size={16} weight="bold"/><span>Reset</span></button>
    {open && <div className="v4-pose-choices" role="group" aria-label="Hand poses">
      <p>Slide to a pose</p>
      {poseOptions.map((option, index) => <button key={option.id} data-pose={option.id} className={`v4-pose-option option-${index} ${hover === option.id ? 'is-target' : ''}`} aria-label={`Pose: ${option.label}`} aria-pressed={pose === option.id} onClick={() => choose(option.id, true)}>
        <img src={`/assets/canonical/pose-${option.id}.webp?v=20261021-soft-2`} alt="" draggable={false}/><span>{option.label}</span>
      </button>)}
      <button className="v4-pose-close" aria-label="Close pose choices" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16}/></button>
    </div>}
    <button ref={trigger} className="v4-pose-trigger" aria-label={`Choose a hand pose, current pose ${poseLabel}`} aria-expanded={open} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onClick={event => { if (event.detail === 0) { onOpen(); setOpen(v => !v); } }}><HandPalm size={24} weight="bold"/></button>
    <span className="v4-pose-label">{open ? 'Release to choose' : 'Poses'}</span>
    <span className="v4-sr-only" role="status">{poseLabel} pose selected</span>
  </div>;
}
