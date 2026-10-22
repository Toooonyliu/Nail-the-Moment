import PageHeader from './PageHeader';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarBlank, Check, GridFour, MagnifyingGlass, Plus, Rectangle, Trash, X } from '@phosphor-icons/react';
import { BottomSheet, Carousel, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard } from './mobile';
import { localDate, photoSrc, type MomentRecord } from './studio-data';
import './moments.css';
import { samplePhotoCredit } from './moment-photo-credits';
import { timelineIndex, timelinePosition } from './timeline-progress';

type Props = { focusId?:string|null; onFocusConsumed?:()=>void; moments: MomentRecord[]; onAdd: () => void; onUpdate: (moment: MomentRecord) => void; onDelete: (moment: MomentRecord) => void; onRemix: (moment: MomentRecord) => void };
const stickers=['🎀','🫧','🦋','🍒','🐚','🪩','☕','🌙','⭐','🧸','🌸','🍋','🏖️','🌊','☀️','🍁','🎃','❄️','🎄','🎅','🎂','💍','💌','🥂','🎁','✨','🩰','💐'];
const shapes=['Almond','Oval','Square','Squoval','Round','Coffin','Stiletto'];
const colorNames=['Milky pink','Red glitter','Sheer pink','Peach','Mocha','Pearl white','Silver chrome','Slate','Orange','Black','Lavender','Sky blue'];
const colorHex=['#e7b1ac','#b93d4d','#f0c3be','#ecb296','#886858','#e7e3d9','#a2a5a6','#666d67','#dd843e','#333330','#b9abcf','#a3bec9'];
const dateText=(v:string)=>v.replaceAll('-','.');
const fullDate=(v:string)=>new Date(`${v}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
const tone=(s?:string)=>s&&'🎄🌊🦋❄️'.includes(s)?'#e9f1ed':s&&'🍋☀️⭐🥂'.includes(s)?'#fcf3d9':s&&'🪩'.includes(s)?'#ede9f4':'#f7e8ec';
export function matchesMoment(m:MomentRecord, query:string, now=new Date()) {
  let q=query.trim().toLowerCase();
  const lastYear=/去年|last year/.test(q);q=q.replace(/去年|last year/g,'').trim();
  const aliases:Record<string,string>={'红色':'red','粉色':'pink','法式':'french','圣诞':'christmas','镜面':'chrome','杏仁':'almond','银色':'silver'};
  Object.entries(aliases).forEach(([a,b])=>{q=q.replaceAll(a,b);});
  const hay=[m.title,m.date,m.occasion,m.note,m.mood,m.artist,m.shape,m.type,...m.colors??[],...m.tags??[]].join(' ').toLowerCase();
  return (!lastYear||Number(m.date.slice(0,4))===now.getFullYear()-1)&&q.split(/\s+/).every(t=>hay.includes(t));
}
export default function Moments({focusId,onFocusConsumed,moments,onAdd,onUpdate,onDelete,onRemix}:Props) {
  const keyboard=useKeyboard();
  const ordered=useMemo(()=>[...moments].sort((a,b)=>a.date.localeCompare(b.date)),[moments]);
  const years=useMemo(()=>[...new Set(ordered.map(m=>m.date.slice(0,4)))].reverse(),[ordered]);
  const [overviewYear,setOverviewYear]=useState<string|null>(null);
  const [view,setView]=useState<'single'|'overview'>('single');
  const [activeId,setActiveId]=useState(()=>focusId||(ordered.find(m=>m.title==='Christmas')||ordered[ordered.length-1])?.id||'');
  const [query,setQuery]=useState(''); const [search,setSearch]=useState(false);
  const [detailId,setDetailId]=useState<string|null>(null);const [flipping,setFlipping]=useState(false);const [closing,setClosing]=useState(false);
  const [currency,setCurrency]=useState('USD');
  const [editor,setEditor]=useState<string|null>(null);const [value,setValue]=useState('');const [editError,setEditError]=useState('');
  const [held,setHeld]=useState(false);const [width,setWidth]=useState(420);
  const returnFocus=useRef<HTMLElement|null>(null),searchReturnFocus=useRef<HTMLElement|null>(null);
  const root=useRef<HTMLDivElement>(null),collection=useRef<HTMLDivElement>(null);
  const heldRef=useRef(false),positionRef=useRef(0);
  const [position,setPosition]=useState(0);
  const active=Math.max(0,ordered.findIndex(m=>m.id===activeId));const current=ordered[active];
  const detail=ordered.find(m=>m.id===detailId);
  const credit=detail?samplePhotoCredit(detail):null;const editing=ordered.find(m=>m.id===(detailId||activeId))||current;
  const cardWidth=Math.min(300,width*.70),stride=cardWidth+26;
  const filtered=useMemo(()=>ordered.filter(m=>matchesMoment(m,query)).reverse(),[ordered,query]);
  const now=new Date(),today=localDate(now);
  const anniversary=ordered.find(m=>m.date.slice(5)===today.slice(5)&&m.date.slice(0,4)<today.slice(0,4));
  useEffect(()=>{if(focusId&&ordered.some(m=>m.id===focusId)){setActiveId(focusId);setDetailId(focusId);onFocusConsumed?.();}},[focusId,ordered]);
  useEffect(()=>{if(!focusId&&!activeId&&ordered.length){setActiveId((ordered.find(m=>m.title==='Christmas')||ordered[ordered.length-1]).id);}},[ordered,activeId]);
  useEffect(()=>{if(!root.current)return;const r=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));r.observe(root.current);return()=>r.disconnect();},[]);
  useEffect(()=>{
    if(!detailId)return;
    const frame=requestAnimationFrame(()=>root.current?.querySelector<HTMLElement>('[data-vm-detail-title]')?.focus({preventScroll:true}));
    return()=>cancelAnimationFrame(frame);
  },[!!detailId]);
  useEffect(()=>{
    if(!search)return;
    const frame=requestAnimationFrame(()=>root.current?.querySelector<HTMLElement>('[data-vm-search-title]')?.focus({preventScroll:true}));
    return()=>cancelAnimationFrame(frame);
  },[search]);
  const track=()=>collection.current?.querySelector<HTMLDivElement>('.mobile-carousel');
  function go(index:number,smooth=true){const next=timelineIndex(index,ordered.length);if(!ordered[next])return;setActiveId(ordered[next].id);positionRef.current=next;setPosition(next);track()?.scrollTo({left:next*stride,behavior:smooth&&Math.abs(next-active)<=1&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});}
  function seek(value:number){const next=timelinePosition(value,ordered.length);positionRef.current=next;setPosition(next);const item=ordered[timelineIndex(next,ordered.length)];if(item)setActiveId(item.id);track()?.scrollTo({left:next*stride,behavior:'instant'});}
  function finishSeek(){heldRef.current=false;setHeld(false);go(positionRef.current);}
  useEffect(()=>{if(view!=='single'||search)return;const n=track();if(!n)return;let timer:ReturnType<typeof setTimeout>;let disposed=false;
    const onScroll=()=>{clearTimeout(timer);const next=timelinePosition(n.scrollLeft/stride,ordered.length);positionRef.current=next;setPosition(next);const i=timelineIndex(next,ordered.length);if(ordered[i])setActiveId(ordered[i].id);if(heldRef.current)return;timer=setTimeout(()=>{if(disposed||heldRef.current)return;const target=i*stride;if(Math.abs(n.scrollLeft-target)>1)n.scrollTo({left:target,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},180);};
    n.scrollLeft=active*stride;positionRef.current=active;setPosition(active);n.addEventListener('scroll',onScroll);return()=>{disposed=true;clearTimeout(timer);n.removeEventListener('scroll',onScroll);};
  },[view,search,stride,ordered.map(m=>m.id).join(',')]);
  useEffect(()=>{if(!root.current)return;const el=root.current;function key(e:KeyboardEvent){if((e.target as HTMLElement).closest('input,textarea,select,[role=tab]')||editor||detailId||search||view!=='single')return;if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?ordered.length-1:active+(e.key==='ArrowRight'?1:-1));}}
    el.addEventListener('keydown',key);return()=>el.removeEventListener('keydown',key);
  },[active,ordered.length,editor,detailId,stride,search,view]);
  function open(m:MomentRecord,trigger?:HTMLElement){returnFocus.current=trigger??document.activeElement as HTMLElement;keyboard.hide();setFlipping(true);setDetailId(m.id);setTimeout(()=>setFlipping(false),520);}
  function close(){keyboard.hide();setClosing(true);setTimeout(()=>{setDetailId(null);setClosing(false);requestAnimationFrame(()=>{const el=returnFocus.current;if(el?.isConnected&&!el.closest('[inert]'))el.focus({preventScroll:true});});},matchMedia('(prefers-reduced-motion: reduce)').matches?0:250);}
  function edit(field:string,id?:string){keyboard.hide();if(id){setActiveId(id);}const m=ordered.find(m=>m.id===(id||detailId||activeId))||current;if(!m)return;setCurrency(m.currency||'USD');setValue(field==='colors'?(m.colors||[]).join(', '):String(m[field as keyof MomentRecord]??''));setEditError('');setEditor(field);}
  function save(){if(!editing||!editor)return;let next={...editing};
    if(editor==='title'&&!value.trim()){setEditError('Enter a title.');return;}
    if(editor==='date'){const d=new Date(`${value}T12:00:00`);if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(d.getTime())||localDate(d)!==value||value>today){setEditError('Choose a valid day, up to today.');return;}}
    if(editor==='amount'&&(!value.trim()||!Number.isFinite(Number(value))||Number(value)<0)){setEditError('Enter a valid amount.');return;}
    next={...next,[editor]:editor==='colors'?value.split(',').map(v=>v.trim()).filter(Boolean):editor==='amount'?Number(value):value.trim()};
    if(editor==='amount')next.currency=currency;
    onUpdate(next);keyboard.hide();setEditor(null);
  }
  const mini=(m:MomentRecord)=><button className="vm-mini" key={m.id} onClick={e=>open(m,e.currentTarget)} aria-label={`Open memory: ${m.title}`}><span className="vm-mini-paper"><img src={photoSrc(m.photo)} alt={m.title} draggable={false}/><time>{dateText(m.date)}</time>{m.sticker&&<i style={{background:tone(m.sticker)}}>{m.sticker}</i>}{m.isDemo&&<small>Sample</small>}</span><strong>{m.title}</strong></button>;
  const fields: [string,string,string][] = detail ? [['colors','Color',detail.colors?.join(', ')||'Add color'],['shape','Shape',detail.shape||'Add shape'],['type','Nail type',detail.type||'Add type'],['occasion','Occasion',detail.occasion||'Add occasion'],['note','Note',detail.note||'Add a note'],['artist','Manicurist',detail.artist||'Add manicurist'],['amount','Amount',detail.amount===undefined?'Add amount':`${detail.currency||'USD'} ${detail.amount}`]]:[];
  return <div ref={root} className="vm-root" tabIndex={-1} style={{'--vm-card':`${cardWidth}px`,'--vm-side':`${(width-cardWidth)/2}px`} as CSSProperties}>
    <header className="vm-heading" inert={search||!!detailId}><PageHeader title="Moments" actions={<span className="vm-header-actions"><button aria-label="Add a moment" onClick={onAdd}><Plus size={23}/></button><button aria-label="Search moments" onClick={()=>{searchReturnFocus.current=document.activeElement as HTMLElement;keyboard.hide();setSearch(true);}}><MagnifyingGlass size={23}/></button></span>}/><div className="vm-switch" role="tablist" aria-label="Browse moments" onKeyDown={e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();const next=e.key==='Home'?'single':e.key==='End'?'overview':view==='single'?'overview':'single';setView(next);
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next==='single'?0:1]?.focus({preventScroll:true});
    }}><span style={{transform:`translateX(${view==='overview'?'100%':'0'})`}}/><button role="tab" tabIndex={view==='single'?0:-1} aria-label="One by one" aria-selected={view==='single'} onClick={()=>setView('single')}><Rectangle size={22}/></button><button role="tab" tabIndex={view==='overview'?0:-1} aria-label="All moments" aria-selected={view==='overview'} onClick={()=>setView('overview')}><GridFour size={22}/></button></div></header>
    {!ordered.length?<div className="vm-empty"><CalendarBlank size={40}/><h2>No moments yet</h2><button onClick={onAdd}>Add your first photo <Plus size={17}/></button></div>:view==='single'?<div className="vm-single" inert={search||!!detailId}>
      {anniversary&&<button className="vm-anniversary" onClick={()=>go(ordered.findIndex(m=>m.id===anniversary.id))}>On this day · {now.getFullYear()-Number(anniversary.date.slice(0,4))} years ago <ArrowUpRight size={13}/></button>}
      <div className="vm-collection" ref={collection}><Carousel ariaLabel="Manicure photo carousel" className="vm-carousel" contentClassName="vm-carousel-content">{ordered.map((m,i)=><article className={`vm-card ${i===active?'is-current':''}`} key={m.id} role="group" aria-roledescription="slide" aria-label={`${i+1} of ${ordered.length}`} aria-hidden={i!==active} style={{'--vm-angle':`${i<active?-5:i>active?5:0}deg`} as CSSProperties}><div className="vm-polaroid"><button className="vm-photo-open" tabIndex={i===active?0:-1} aria-label={`Open memory: ${m.title}`} onClick={e=>i===active?open(m,e.currentTarget):go(i)}><img src={photoSrc(m.photo)} alt={m.title} draggable={false}/><span className="vm-caption"><strong>{m.title}</strong><time>{dateText(m.date)}</time></span></button><button className={`vm-sticker ${!m.sticker?'is-empty':''}`} style={{background:tone(m.sticker)}} tabIndex={i===active?0:-1} aria-label={`Change sticker for ${m.title}`} onClick={()=>edit('sticker',m.id)}>{m.sticker||'+'}</button>{m.isDemo&&<span className="vm-sample">Sample memory</span>}</div></article>)}</Carousel></div>
      <div className="vm-ruler-area"><div className={`vm-ruler ${held?'is-held':''}`}>
        {Array.from({length:49},(_,i)=>{const distance=Math.abs(i-position/Math.max(1,ordered.length-1)*48);return <i key={i} aria-hidden="true" style={{height:`${22+(held?23:10)*Math.exp(-((distance/4)**2))+(i%6===0?7:0)}px`,background:i/48<=position/Math.max(1,ordered.length-1)?'#b99487':'#ded4c9'}}/>;})}
        <span className="vm-ruler-marker" aria-hidden="true" style={{left:`${position/Math.max(1,ordered.length-1)*100}%`}}/>
        <input className="vm-scrub-input" type="range" aria-label="Browse manicure moments" aria-valuetext={current?`${active+1} of ${ordered.length}: ${current.title}, ${fullDate(current.date)}`:''} min={0} max={Math.max(0,ordered.length-1)} step={.001} value={position} disabled={ordered.length<2} data-scroll-drag="ignore" onPointerDown={()=>{heldRef.current=true;setHeld(true);}} onChange={e=>seek(Number(e.target.value))} onPointerUp={finishSeek} onPointerCancel={finishSeek} onBlur={()=>{if(heldRef.current)finishSeek();}} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();go(e.key==='Home'?0:e.key==='End'?ordered.length-1:active+(['ArrowRight','ArrowUp'].includes(e.key)?1:['ArrowLeft','ArrowDown'].includes(e.key)?-1:e.key==='PageUp'?5:-5));}}/>
      </div><div className="vm-ruler-labels"><button aria-label="Previous moment" disabled={active===0} onClick={()=>go(active-1)}><ArrowLeft size={18}/></button><span role="status" aria-live="polite" aria-atomic="true"><time dateTime={current?.date}>{current?.date.slice(0,7).replace('-',' · ')}</time><small>{active+1} / {ordered.length}</small></span><button aria-label="Next moment" disabled={active===ordered.length-1} onClick={()=>go(active+1)}><ArrowRight size={18}/></button></div></div>
    </div>:<div className="vm-overview-shell" inert={search||!!detailId}>
      <div className="vm-year-nav" role="group" aria-label="Browse years"><button aria-pressed={!overviewYear} onClick={()=>{setOverviewYear(null);root.current?.querySelector('.vm-overview .mobile-scroll')?.scrollTo({top:0});}}>All years</button>{years.map(year=><button key={year} aria-pressed={overviewYear===year} onClick={()=>{setOverviewYear(year);root.current?.querySelector('.vm-overview .mobile-scroll')?.scrollTo({top:0});}}>{year}</button>)}</div>
      <MobileScroll className="vm-overview"><div className="vm-overview-content">{years.filter(year=>!overviewYear||year===overviewYear).map(year=><section key={year}><h2>{year}<span>{ordered.filter(m=>m.date.startsWith(year)).length} {ordered.filter(m=>m.date.startsWith(year)).length===1?'moment':'moments'}</span></h2>{[1,0].map(half=>{const items=ordered.filter(m=>m.date.startsWith(year)&&(Number(m.date.slice(5,7))>6?1:0)===half).reverse();return items.length>0&&<div className="vm-season" key={half}><h3>{half?'JUL — DEC':'JAN — JUN'}</h3><div className="vm-grid">{items.map(mini)}</div></div>;})}</section>)}</div></MobileScroll></div>}
    {search&&<section className="vm-search-screen" inert={!!detailId}><header><h2 tabIndex={-1} data-vm-search-title>Search</h2><button aria-label="Close search" onClick={()=>{keyboard.hide();setSearch(false);setQuery('');requestAnimationFrame(()=>searchReturnFocus.current?.focus({preventScroll:true}));}}><X size={22}/></button></header><div className="vm-searchbox"><MagnifyingGlass size={20}/><KeyboardInput aria-label="Search moments" placeholder="Color, shape, occasion…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={17}/></button>}</div><MobileScroll className="vm-search-results"><p className="vm-search-count" role="status" aria-live="polite" aria-atomic="true">{filtered.length} {filtered.length===1?'moment':'moments'}{query?' found':' to explore'}</p><div className="vm-grid">{filtered.map(mini)}</div>{!filtered.length&&<div className="vm-empty"><h2>No results</h2><button onClick={()=>setQuery('')}>Clear search</button></div>}</MobileScroll></section>}
    {detail&&<section className={`vm-detail ${closing?'is-closing':''}`}><header><button aria-label="Back to moments" onClick={close}><ArrowLeft size={23}/></button><h2 tabIndex={-1} data-vm-detail-title>Info</h2><button aria-label="Remove moment" onClick={()=>{const index=ordered.findIndex(m=>m.id===detail.id);setActiveId((ordered[index+1]??ordered[index-1])?.id??'');onDelete(detail);setDetailId(null);}}><Trash size={20}/></button></header><MobileScroll className="vm-detail-scroll"><div className="vm-detail-paper"><img className="vm-detail-photo" src={photoSrc(detail.photo)} alt={detail.title}/><button className="vm-sticker" style={{background:tone(detail.sticker)}} onClick={()=>edit('sticker')} aria-label="Change moment sticker">{detail.sticker||'+'}</button><div className="vm-detail-fields">{fields.map(([key,label,text])=><button key={key} onClick={()=>edit(key)}><span>{label}</span><strong>{text}</strong><ArrowUpRight size={13}/></button>)}</div><button className="vm-detail-title" onClick={()=>edit('title')}>{detail.title}</button><button className="vm-detail-date" onClick={()=>edit('date')}>{dateText(detail.date)}</button>{detail.isDemo&&<small className="vm-detail-sample">Sample memory</small>}</div><p className="vm-photo-credit">{credit&&<a href={credit.url} target="_blank" rel="noopener noreferrer">Photo: {credit.name}</a>}</p><button className="vm-remix" onClick={()=>{keyboard.hide();onRemix(detail);}}>Use colors in Studio <ArrowUpRight size={18}/></button></MobileScroll></section>}
    <BottomSheet open={!!editor} onOpenChange={o=>{if(!o){keyboard.hide();setEditor(null);}}} title={editor==='sticker'?'Stickers':editor==='colors'?'Color':editor?editor[0].toUpperCase()+editor.slice(1):''} snap={editor==='sticker'?.64:.48}><div className="vm-editor">
      {editor==='amount'&&<select aria-label="Currency" value={currency} onChange={e=>setCurrency(e.target.value)}>{['USD','CNY','EUR','GBP'].map(c=><option key={c}>{c}</option>)}</select>}
      {editor==='sticker'?<><div className="vm-sticker-grid">{stickers.map(st=><button key={st} style={{background:tone(st)}} aria-label={`Choose ${st} sticker`} aria-pressed={value===st} onClick={()=>setValue(st)}>{st}{value===st&&<Check size={12}/>}</button>)}</div><button className="vm-no-sticker" onClick={()=>setValue('')}>No sticker {value===''&&<Check size={15}/>}</button></>:editor==='shape'||editor==='type'?<div className="vm-options">{(editor==='shape'?shapes:['Gel','Gel art','Chrome','Extensions','Press-on','Natural']).map(v=><button key={v} aria-pressed={value===v} onClick={()=>setValue(v)}>{v}{value===v&&<Check size={15}/>}</button>)}</div>:editor==='colors'?<div className="vm-color-options">{colorNames.map((v,i)=><button key={v} aria-pressed={value.split(',').map(x=>x.trim()).includes(v)} onClick={()=>{const vs=value.split(',').map(x=>x.trim()).filter(Boolean);setValue((vs.includes(v)?vs.filter(x=>x!==v):[...vs.slice(-3),v]).join(', '));}}><i style={{background:colorHex[i]}}/>{v}</button>)}</div>:editor==='note'?<KeyboardTextarea aria-label="Note" rows={4} maxLength={250} value={value} onChange={e=>{setValue(e.target.value);setEditError('');}}/>:<KeyboardInput name={editor||'value'} autoComplete="off" aria-invalid={!!editError} aria-describedby={editError?'moment-edit-error':undefined} aria-label={editor||'Value'} placeholder={editor==='date'?'YYYY-MM-DD':editor==='amount'?'Amount in USD':''} inputMode={editor==='amount'?'decimal':'text'} maxLength={editor==='date'?10:70} value={value} onChange={e=>{setValue(e.target.value);setEditError('');}} onKeyDown={e=>e.key==='Enter'&&save()}/>}
      {editError&&<p id="moment-edit-error" role="alert">{editError}</p>}<button className="vm-editor-save" onClick={save}>Save</button></div></BottomSheet>
  </div>;
}
