import { useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, ArrowCounterClockwise, ArrowClockwise, ArrowsClockwise, BookmarkSimple, Camera, CaretDown, CaretLeft, CaretRight, Check, CheckCircle, Compass, Copy, Cube, DownloadSimple, FolderPlus, FolderSimple, Flower, HandPalm, Heart, ImageSquare, Info, LockSimple, MagnifyingGlass, Palette, Plus, SlidersHorizontal, Sparkle, Star, Trash, UploadSimple, X, HandFist, HandPeace, HandPointing, ClockCounterClockwise, DotsThree, FloppyDisk, Shuffle, MagnifyingGlassPlus, MagnifyingGlassMinus, PencilSimple, Ruler, CircleHalf } from '@phosphor-icons/react';
import { BottomSheet, Carousel, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard, useKeyboardInsets } from './mobile';
import HandScene, { type HandSceneHandle, type NailAppearance, type HandPose } from './HandScene';
import { addPhotoDesign, baseColors, createProject, initialData, inspirations, migrateData, nailsFromInspiration, photoSrc, readImageFile, skinTones, type HandProfile, type Inspiration, type StudioData, type StudioProject, type MomentRecord, type TryOnPhoto, createMoment, localDate } from './studio-data';
import { canonicalHand, inspirationPreview } from './canonical-hand';
import PoseKnob from './PoseKnob';
import PageHeader from './PageHeader';
import Brand from './Brand';
import Saved from './Saved';
import { readPrototypeState, writePrototypeState } from './prototype-store';
import '@fontsource/fraunces/700.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/500-italic.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-mono/400.css';
import Moments from './Moments';
import ColorPicker, { ShapeIcon } from './ColorPicker';
import ArSession from './ArSession';
import './prototype.css';
import './version-two.css';
import './ux-refinements.css';
import './phone.css';
import './studio-three.css';
import './saved-four.css';
import './visual-polish.css';
import './controls-eight.css';

type Route = 'onboarding' | 'moments' | 'moment' | 'momentForm' | 'home' | 'setup' | 'scanning' | 'handReady' | 'source' | 'applying' | 'editor' | 'review' | 'inspiration' | 'saved' | 'post' | 'project' | 'ar';
type Sheet = 'drafts' | 'tryOn' | 'about' | 'profile' | 'folder' | 'newFolder' | 'upload' | 'filter' | 'lookActions' | 'export' | 'fingers' | 'finish' | 'length' | 'detailEdit' | 'newSet' | 'momentActions' | 'arIntro' | 'discard' | null;
type History = { past: StudioProject[]; present: StudioProject; future: StudioProject[]; group?: string };
type Action = { type: 'edit'; value: StudioProject; group?: string } | { type: 'load'; value: StudioProject } | { type: 'undo' | 'redo' };
function designHistory(state: History, action: Action): History {
  if (action.type === 'load') return { past: [], present: action.value, future: [] };
  if (action.type === 'edit') return { past: action.group && action.group === state.group ? state.past : [...state.past.slice(-29), state.present], present: action.value, future: [], group: action.group };
  if (action.type === 'undo' && state.past.length) return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future] };
  if (action.type === 'redo' && state.future.length) return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) };
  return state;
}
const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
const elementIcons = { star: Star, heart: Heart, pearl: Sparkle, flower: Flower };
const displayColor = (color: string) => baseColors.find(c => c.color.toLowerCase() === color.toLowerCase())?.name ?? color.toUpperCase();
const sampleHand: HandProfile = canonicalHand;
function Button({ children, onClick, tone = 'dark', disabled = false, className = '' }: { children: ReactNode; onClick: () => void; tone?: 'dark' | 'aqua' | 'light'; disabled?: boolean; className?: string }) { return <button className={`nm-button ${tone} ${className}`} disabled={disabled} onClick={onClick}><span>{children}</span></button>; }
function Chip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick: () => void }) { return <button className={`nm-chip ${active ? 'active' : ''}`} aria-pressed={!!active} onClick={onClick}><span>{children}</span></button>; }

export default function Prototype() {
  const keyboard = useKeyboard();
  const { bottomInset, isKeyboardVisible } = useKeyboardInsets();
  const [data, setData] = useState<StudioData>(initialData);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>('onboarding');
  const [rootTab, setRootTab] = useState<'home' | 'inspiration' | 'saved' | 'moments'>('home');
  const routeStack = useRef<Route[]>([]);
  const [history, dispatch] = useReducer(designHistory, { past: [], present: createProject(inspirations[0]), future: [] });
  const project = history.present;
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedNail, setSelectedNail] = useState<number | null>(null);
  const [pose, setPose] = useState<HandPose>('fan');
  const [poseResetKey, setPoseResetKey] = useState(0);
  const [studioPanel, setStudioPanel] = useState<'edit'|null>(null);
  const [arrival, setArrival] = useState(false);
  const [moment, setMoment] = useState<MomentRecord | null>(null);
  const [momentFocus,setMomentFocus]=useState<string|null>(null);
  const [momentPhoto, setMomentPhoto] = useState('');
  const [momentTitle, setMomentTitle] = useState('');
  const [momentNote, setMomentNote] = useState('');
  const [momentDate, setMomentDate] = useState(localDate());
  const [momentOccasion, setMomentOccasion] = useState('Everyday');
  const [momentError, setMomentError] = useState('');
  const [isNewMemory, setIsNewMemory] = useState(false);
  const momentInput = useRef<HTMLInputElement>(null);
  const handCameraInput = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<'color' | 'shape' | 'length' | 'finish' | 'details'>('color');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [post, setPost] = useState<Inspiration>(inspirations[0]);
  const [pendingSource, setPendingSource] = useState<Inspiration | null>(null);
  const [sourceTab, setSourceTab] = useState<'ideas' | 'saved'>('ideas');
  const [savedTab, setSavedTab] = useState<'looks' | 'inspiration'>('looks');
  const [savedSpace, setSavedSpace] = useState<'library'|'community'>('library');
  const [selectedTryOn, setSelectedTryOn] = useState<TryOnPhoto|null>(null);
  const tryOnInput = useRef<HTMLInputElement>(null);
  const [activeFolder, setActiveFolder] = useState('all');
  const [query, setQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState('All');
  const [pendingSave, setPendingSave] = useState<Inspiration | null>(null);
  const [folderChoice, setFolderChoice] = useState('all');
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [folderReturn, setFolderReturn] = useState<'folder' | 'upload' | 'saved'>('saved');
  const [uploadDraft, setUploadDraft] = useState<Inspiration | null>(null);
  const [uploadContext, setUploadContext] = useState<'source' | 'saved'>('saved');
  const [uploadTitle, setUploadTitle] = useState('');
  const [working, setWorking] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exportImage, setExportImage] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const sourceTarget = useRef<'new' | 'replace'>('new');
  const handInput = useRef<HTMLInputElement>(null);
  const inspirationInput = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<HandSceneHandle>(null);
  const appRoot = useRef<HTMLElement>(null);
  const editGroup = useRef<string | undefined>(undefined);
  const pointerAction=useRef(false);
  const pendingTransition = useRef<(() => void) | null>(null);
  const detailDrag = useRef<{kind:'star'|'heart'|'pearl'|'flower';x:number;y:number;moved:boolean}|null>(null);
  const [dragGhost,setDragGhost] = useState<{kind:string;x:number;y:number}|null>(null);
  const [arMode,setArMode] = useState<'camera'|'controls'>('camera');
  const [detailHint,setDetailHint] = useState(false);
  const [toolsHeight,setToolsHeight] = useState(0);

  const allIdeas = useMemo(() => [...data.uploads, ...inspirations], [data.uploads]);
  const hand = data.hand ?? sampleHand;
  const source = allIdeas.find(i => i.id === project.sourceId);
  const currentNail = project.nails[selectedNail ?? 0];
  const mixedNails=(key:'length'|'shape'|'finish')=>selectedNail===null&&project.nails.some(n=>n[key]!==project.nails[0][key]);
  const uniformColors = project.nails.every(n => n.color.toLowerCase() === project.nails[0].color.toLowerCase());
  const selectedColor = selectedNail === null && !uniformColors ? null : currentNail.color;
  const studioColors = [...(source?.source === 'upload' ? source.palette ?? [] : []).filter(color => !baseColors.some(c => c.color.toLowerCase() === color.toLowerCase())).map((color,i)=>({name:`Photo color ${i+1}`,color})),...baseColors];
  const elementNail = selectedNail ?? 3;
  const currentElements = project.nails[elementNail].elements;
  const currentElement = currentElements.find(e => e.id === selectedElement);
  const folderLabel = (id?: string) => data.folders.find(f => f.id === id)?.name ?? 'All';
  const isRoot = ['home', 'saved', 'moments'].includes(route);
  const isEditor = route === 'home' || route === 'editor';
  const rootStyle = { '--nm-bottom': `${bottomInset}px`, '--nm-tools-height': `${studioPanel==='edit'?toolsHeight:0}px` } as CSSProperties;

  useEffect(() => {
    // Keep native focus scrolling inside the app's scroll surfaces. The phone's
    // clipping viewport also contains the offscreen keyboard and must stay at 0.
    const screen=appRoot.current?.closest<HTMLElement>('.device-screen');
    if(!screen)return;
    const reset=()=>{if(screen.scrollTop||screen.scrollLeft)screen.scrollTo(0,0);};
    reset();screen.addEventListener('scroll',reset,{passive:true});
    return()=>screen.removeEventListener('scroll',reset);
  },[]);
  useEffect(() => {
    const tools=appRoot.current?.querySelector<HTMLElement>('.nm-studio-tools');
    if(!tools){setToolsHeight(0);return;}
    const observer=new ResizeObserver(()=>setToolsHeight(tools.offsetHeight));
    observer.observe(tools);return()=>observer.disconnect();
  },[isEditor,studioPanel]);
  useEffect(() => { let live = true; readPrototypeState<unknown>().then(raw => { if (!live) return; const next = migrateData(raw); setData(next); const target=new URLSearchParams(location.search).get('screen');const entry=target==='moments'||target==='saved'||target==='studio'?target==='studio'?'home':target:null;setRoute(target==='ar'?'ar':entry??(next.onboardingCompleted?'home':'onboarding'));if(target==='ar')setArMode('controls');if(new URLSearchParams(location.search).get('panel')==='edit')setStudioPanel('edit');if(entry)setRootTab(entry);setData(d=>({...d,hand:(entry||target==='ar')?(d.hand??sampleHand):d.hand})); if (next.draft) { dispatch({ type: 'load', value: next.draft }); setSessionStarted(true); } }).catch(() => { if (live) setToast({ text: 'Your collection could not be restored on this browser.' }); }).finally(() => { if (live) setReady(true); }); return () => { live = false; }; }, []);
  useEffect(() => { if (!ready) return; const timer = window.setTimeout(() => { writePrototypeState(data).catch(() => setToast({ text: 'Storage is full. Keep this tab open to retain your changes.' })); }, 280); return () => window.clearTimeout(timer); }, [data, ready]);
  useEffect(() => { if (sessionStarted && ready) setData(current => ({ ...current, draft: project })); }, [project, sessionStarted, ready]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), toast.undo ? 15000 : 6000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (route !== 'scanning' && route !== 'applying') return; const timer = window.setTimeout(() => { setData(d => ({ ...d, onboardingCompleted: true })); setArrival(true); setPose('fan'); if (pendingSource) { applySource(pendingSource); return; } routeStack.current = []; setRootTab('home'); setRoute('home'); }, 1650); return () => window.clearTimeout(timer); }, [route, pendingSource]);
  useEffect(() => { if (!arrival) return; const timer = window.setTimeout(() => setArrival(false), 1600); return () => window.clearTimeout(timer); }, [arrival]);
  useEffect(() => { setRenderFailed(false); setSceneReady(false); }, [route]);

  function go(next: Route) { keyboard.hide(); if (next === 'editor') { setRootTab('home'); setRoute('home'); setSheet(null); return; } routeStack.current.push(route); setRoute(next); setSheet(null); }
  function back() { keyboard.hide(); setSheet(null); setRoute(routeStack.current.pop() ?? rootTab); }
  function root(next: 'home' | 'inspiration' | 'saved' | 'moments') { keyboard.hide(); setSheet(null); routeStack.current = []; setRootTab(next); setRoute(next); setQuery(''); setStyleFilter('All'); }
  function openSheet(next: Sheet) { keyboard.hide(); setSheet(next); }
  function closeSheet() { keyboard.hide(); setSheet(null); }
  function editProject(next: StudioProject) { setSessionStarted(true); dispatch({ type: 'edit', group:editGroup.current, value: { ...next, updatedAt: new Date().toISOString() } }); setSavedSuccess(false); }
  function changeNails(change: (nail: NailAppearance, index: number) => NailAppearance) { editProject({ ...project, nails: project.nails.map((n, i) => selectedNail === null || selectedNail === i ? change(n, i) : n) }); }
  function doStartNew() { sourceTarget.current = 'new'; setPendingSource(null); setSessionStarted(true); dispatch({ type: 'load', value: createProject() }); setSelectedNail(null); setTool('color'); if (data.hand) { root('home'); setToast({text:'Fresh canvas ready'}); } else go('setup'); }
  function protectDraft(action:()=>void) { if(history.past.length&&!savedSuccess){pendingTransition.current=action;openSheet('discard');}else action(); }
  function startNew() { protectDraft(doStartNew); }
  function startDemo() { const next = createProject(inspirations[0]); setData(d => ({ ...d, hand: d.hand ?? sampleHand, onboardingCompleted: true })); dispatch({ type: 'load', value: next }); setSessionStarted(true); setSelectedNail(null); setTool('color'); setPendingSource(null); setArrival(true); go('editor'); }
  function useSource(item: Inspiration) { if(history.past.length&&!savedSuccess){pendingTransition.current=()=>useSourceNow(item);openSheet('discard');return;}useSourceNow(item); }
  function useSourceNow(item: Inspiration) { sourceTarget.current = 'new'; setPendingSource(item); if (!data.hand) { setSessionStarted(true); go('setup'); return; } applySource(item); }
  function applySource(item: Inspiration) { setPost(item); setPendingSource(null); const replace = sourceTarget.current === 'replace'; const base = replace ? project : createProject(item); dispatch({ type: replace ? 'edit' : 'load', value: { ...base, nails: nailsFromInspiration(item), name: `${item.title}, my way`, sourceId: item.id, sourceTitle: item.title, preview: null, updatedAt: new Date().toISOString() } }); sourceTarget.current = 'replace'; setSessionStarted(true); setSelectedNail(null); setSelectedElement(null); setData(d => ({ ...d, onboardingCompleted: true })); setArrival(true); root('home'); }
  function confirmHand() { setData(d => ({ ...d, onboardingCompleted: true })); if (pendingSource) applySource(pendingSource); else root('home'); }
  function useSampleHand() { setData(d => ({ ...d, hand: sampleHand })); setSessionStarted(true); go('scanning'); }
  async function chooseHand(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setWorking(true); try { const img = await readImageFile(file); setData(d => ({ ...d, hand: { photo: img.data, side: 'right', skinTone: d.hand?.skinTone ?? sampleHand.skinTone } })); setSessionStarted(true); go('scanning'); } catch (error) { setToast({ text: error instanceof Error ? error.message : 'This photo could not be opened.' }); } finally { setWorking(false); } }
  function selectNail(index: number | null) { setSelectedNail(index); setSelectedElement(null); if(index!==null)setStudioPanel('edit'); }
  function addElement(kind: 'star' | 'pearl' | 'heart' | 'flower') { const id = crypto.randomUUID(); const index = selectedNail ?? 3; setSelectedNail(index); editProject({ ...project, nails: project.nails.map((n, i) => i === index ? { ...n, elements: [...n.elements, { id, kind, color: kind === 'star' ? '#426da3' : kind === 'heart' ? '#b23e68' : '#fff9ef', x: 0, y: .05, scale: 1, rotation: 0 }] } : n) }); setSelectedElement(id); setDetailHint(true); }
  function placeDetail(kind:'star'|'heart'|'pearl'|'flower',index:number,x:number,y:number) {
    const id=crypto.randomUUID();selectNail(index);setSelectedElement(id);setDetailHint(false);
    editProject({...project,nails:project.nails.map((n,i)=>i===index?{...n,elements:[...n.elements,{id,kind,color:kind==='star'?'#426da3':kind==='heart'?'#b23e68':'#fff9ef',x,y,scale:1,rotation:0}]}:n)});
  }
  function moveDetail(index:number,id:string,x:number,y:number,phase:'start'|'move'|'end') {
    if(phase==='start'){editGroup.current=crypto.randomUUID();setSelectedElement(id);return;}
    if(phase==='end'){editGroup.current=undefined;return;}
    editProject({...project,nails:project.nails.map((n,i)=>i===index?{...n,elements:n.elements.map(e=>e.id===id?{...e,x,y}:e)}:n)});
  }
  function detailPointer(e:React.PointerEvent<HTMLButtonElement>,kind:'star'|'heart'|'pearl'|'flower',phase:'start'|'move'|'end'){
    if(phase==='start'){detailDrag.current={kind,x:e.clientX,y:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId);return;}
    const d=detailDrag.current;if(!d)return;
    if(phase==='move'){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)d.moved=true;if(d.moved){const r=e.currentTarget.closest('.nm-app')!.getBoundingClientRect(),scale=r.width/e.currentTarget.closest<HTMLElement>('.nm-app')!.offsetWidth;setDragGhost({kind,x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale});}return;}
    detailDrag.current=null;setDragGhost(null);if(e.type==='pointercancel')return;
    if(d.moved){const hit=sceneRef.current?.hitNail(e.clientX,e.clientY);if(hit)placeDetail(kind,hit.index,hit.x,hit.y);else setToast({text:'Drop the detail onto a nail.'});}else{setDetailHint(true);addElement(kind);}
  }
  function changeElement(patch: Partial<NailAppearance['elements'][number]>) { if (!currentElement) return; editProject({ ...project, nails: project.nails.map((n, i) => i === elementNail ? { ...n, elements: n.elements.map(e => e.id === selectedElement ? { ...e, ...patch } : e) } : n) }); }
  function removeElement() { if (!selectedElement) return; editProject({ ...project, nails: project.nails.map((n, i) => i === elementNail ? { ...n, elements: n.elements.filter(e => e.id !== selectedElement) } : n) }); setSelectedElement(null); }
  function copyToAll() { const nail = project.nails[selectedNail ?? 0]; editProject({ ...project, nails: project.nails.map((_, i) => ({ ...nail, elements: nail.elements.map(e => ({ ...e, id: `${e.id}-${i}-${crypto.randomUUID()}` })) })) }); setSelectedNail(null); setToast({ text: 'This nail’s design is now on the whole set.' }); }
  function reviewSet() { keyboard.hide(); const preview = sceneRef.current?.capture() ?? project.preview; editProject({ ...project, preview }); setSavedSuccess(false); go('review'); }
  function saveSet() { const updated = { ...project, name: project.name.trim() || 'My new set', updatedAt: new Date().toISOString() }; setData(d => ({ ...d, projects: [updated, ...d.projects.filter(p => p.id !== updated.id)], draft: updated })); setSavedSuccess(true); setToast({ text: 'Saved to Studio drafts' }); }
  function openProject(item: StudioProject) { dispatch({ type: 'load', value: structuredClone(item) }); setSelectedNail(null); setSessionStarted(true); setSavedSuccess(true); go('project'); }
  async function openLegacy(look: StudioData['savedLooks'][number]) {
    setWorking(true);
    try{const response=await fetch(photoSrc(look.image));if(!response.ok)throw new Error();const blob=await response.blob();const image=await readImageFile(new File([blob],'saved-try-on.jpg',{type:blob.type||'image/png'}));
      const item:Inspiration={id:`legacy-${look.id}`,title:look.title,image:image.data,artist:'',color:'',style:'',tags:look.tags,source:'upload',palette:image.palette,note:'A previous try-on photo. Use its colors to start a new design.'};
      setData(d=>({...d,uploads:[item,...d.uploads.filter(x=>x.id!==item.id)]}));setPost(item);go('post');
    }catch{setToast({text:'This saved photo could not be opened.'});}finally{setWorking(false);}
  }

  function askSave(item: Inspiration) { setPendingSave(item); setFolderChoice(data.membership[item.id] ?? (rootTab === 'saved' ? activeFolder : 'all')); openSheet('folder'); }
  function confirmFolder() { if (!pendingSave) return; const item = pendingSave; const previous = data.membership[item.id]; const wasSaved = data.savedIds.includes(item.id); setData(d => ({ ...d, savedIds: d.savedIds.includes(item.id) ? d.savedIds : [item.id, ...d.savedIds], membership: { ...d.membership, [item.id]: folderChoice } })); closeSheet(); setToast({ text: `${wasSaved ? 'Moved' : 'Saved'} to ${folderLabel(folderChoice)}`, undo: wasSaved ? () => setData(d => ({ ...d, membership: { ...d.membership, [item.id]: previous ?? 'all' } })) : undefined }); }
  function unsave(item: Inspiration) { setData(d => ({ ...d, savedIds: d.savedIds.filter(id => id !== item.id) })); setToast({ text: 'Removed from inspiration', undo: () => setData(d => ({ ...d, savedIds: [item.id, ...d.savedIds] })) }); }
  function newFolder(origin: 'folder' | 'upload' | 'saved') { setFolderReturn(origin); setFolderName(''); setFolderError(''); openSheet('newFolder'); }
  function createFolder() { const name = folderName.trim(); if (!name || name.toLowerCase() === 'all' || data.folders.some(f => f.name.toLowerCase() === name.toLowerCase())) { setFolderError(!name ? 'Give your folder a name.' : 'That folder name is already in use.'); return; } const id = crypto.randomUUID(); setData(d => ({ ...d, folders: [{ id, name }, ...d.folders] })); setFolderChoice(id); keyboard.hide(); if (folderReturn === 'saved') { setActiveFolder(id); setSavedTab('inspiration'); root('saved'); } else setSheet(folderReturn); }
  function cancelFolder() { keyboard.hide(); setSheet(folderReturn === 'saved' ? null : folderReturn); }
  function startUpload(context: 'source' | 'saved') { if (route === 'inspiration') sourceTarget.current = 'new'; setUploadContext(context); setUploadDraft(null); setUploadTitle(''); setFolderChoice(context === 'saved' ? activeFolder : 'all'); inspirationInput.current?.click(); }
  async function chooseInspirationPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;setWorking(true);
    try {
      const image=await readImageFile(file);
      const item:Inspiration={id:`upload-${crypto.randomUUID()}`,title:image.name,artist:'',image:image.data,source:'upload',palette:image.palette,color:'',style:'',tags:[],note:'Your original inspiration photo. Its palette can be tried in Studio.'};
      const imported=addPhotoDesign(data,item);
      setData(current=>uploadContext==='source'?addPhotoDesign(current,item).data:{...current,uploads:[item,...current.uploads],savedIds:[item.id,...current.savedIds],membership:{...current.membership,[item.id]:folderChoice}});
      if(uploadContext==='source') {
        const show=()=>{dispatch({type:'load',value:imported.project});setData(current=>({...current,hand:current.hand??sampleHand,onboardingCompleted:true}));setSessionStarted(true);setPost(item);setSelectedNail(null);setStudioPanel(null);setArrival(true);root('home');setToast({text:'Saved to Inspiration · colors applied in Studio'});};
        protectDraft(show);
      } else {setSavedSpace('library');setSavedTab('inspiration');setActiveFolder(folderChoice);root('saved');setToast({text:'Photo saved privately to Inspiration'});}
    } catch(error) {setToast({text:error instanceof Error?error.message:'This image could not be opened.'});}
    finally {setWorking(false);}
  }
  async function chooseTryOnPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;setWorking(true);
    try {const image=await readImageFile(file);const photo:TryOnPhoto={id:`try-on-${crypto.randomUUID()}`,title:image.name,image:image.data,date:localDate(),palette:image.palette};setData(current=>({...current,tryOnPhotos:[photo,...current.tryOnPhotos]}));setSavedSpace('library');setSavedTab('looks');root('saved');setToast({text:'Your try-on photo saved privately'});}
    catch(error){setToast({text:error instanceof Error?error.message:'This photo could not be opened.'});}finally{setWorking(false);}
  }
  async function reuseTryOn(photo:TryOnPhoto) {
    setWorking(true);
    try {let palette=photo.palette;if(!palette?.length){const response=await fetch(photoSrc(photo.image));const blob=await response.blob();palette=(await readImageFile(new File([blob],'my-try-on.jpg',{type:blob.type}))).palette;}
      const item:Inspiration={id:`try-on-palette-${photo.id}`,title:photo.title,image:photo.image,palette,source:'upload',artist:'',color:'',style:'',tags:[]};setData(current=>({...current,uploads:[item,...current.uploads.filter(i=>i.id!==item.id)]}));closeSheet();useSource(item);
    }catch{setToast({text:'This photo could not be opened.'});}finally{setWorking(false);}
  }
  function confirmUpload() { if (!uploadDraft || !uploadTitle.trim()) return; const item = { ...uploadDraft, title: uploadTitle.trim() }; setData(d => ({ ...d, uploads: [item, ...d.uploads], savedIds: [item.id, ...d.savedIds], membership: { ...d.membership, [item.id]: folderChoice } })); closeSheet(); if (uploadContext === 'source') { if (route === 'source' && data.hand) applySource(item); else useSource(item); } else { root('saved'); setSavedTab('inspiration'); setActiveFolder(folderChoice); setToast({ text: `Added to ${folderLabel(folderChoice)}` }); } }
  async function downloadRecipe() {
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1420;const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#fffaf6';ctx.fillRect(0,0,1000,1420);ctx.fillStyle='#2b160b';ctx.font='700 46px Fraunces';ctx.fillText(project.name.slice(0,32),65,85);
    const preview=sceneRef.current?.capture()??project.preview;
    if(preview){try{const image=new Image();image.src=preview;await image.decode();const scale=Math.min(870/image.width,760/image.height);ctx.drawImage(image,(1000-image.width*scale)/2,120,image.width*scale,image.height*scale);}catch{}}
    ctx.fillStyle='#2b160b';ctx.font='600 24px DM Sans';ctx.fillText('DESIGN REFERENCE',65,970);
    designSummary(project).forEach(([label,value],i)=>{ctx.fillStyle='#927f72';ctx.font='22px DM Sans';ctx.fillText(label,65,1030+i*56);ctx.fillStyle='#2b160b';ctx.fillText(value.slice(0,54),255,1030+i*56);});
    ctx.font='18px DM Sans';ctx.fillStyle='#927f72';ctx.fillText('Nail the Moment · A reference to discuss with your nail artist.',65,1365);
    setExportImage(canvas.toDataURL('image/png'));openSheet('export');
  }

  function beginMoment() {
    setMomentPhoto(''); setMomentTitle(''); setMomentNote(''); setMomentDate(localDate()); setMomentOccasion('Everyday'); setMomentError(''); setIsNewMemory(false); go('momentForm');
  }
  async function chooseMomentPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setWorking(true); try { const image = await readImageFile(file); setMomentPhoto(image.data); if (!momentTitle) setMomentTitle(''); setMomentError(''); }
    catch(error) { setMomentError(error instanceof Error ? error.message : 'This photo could not be opened.'); } finally { setWorking(false); }
  }
  function saveMoment() {
    if (!momentPhoto) { setMomentError('Add a photo of the set you wore.'); requestAnimationFrame(()=>appRoot.current?.querySelector<HTMLElement>('.nm-memory-photo-input')?.focus({preventScroll:true})); return; }
    if (!momentTitle.trim()) { setMomentError('Give this memory a name.'); requestAnimationFrame(()=>appRoot.current?.querySelector<HTMLElement>('[aria-label="Memory title"]')?.focus()); return; }
    if (momentDate > localDate()) { setMomentError('Choose the day you wore this set.'); return; }
    const entry = createMoment({ title: momentTitle, photo: momentPhoto, date: momentDate, note: momentNote, occasion: momentOccasion });
    setData(d => ({ ...d, moments: [entry, ...d.moments] })); setMoment(entry); setMomentFocus(entry.id); setIsNewMemory(true); keyboard.hide(); root('moments'); setToast({text:'Moment saved'});
  }
  function changeMemoryDate(part: number, value: string) {
    const parts = momentDate.split('-'); parts[part] = value; const year=Number(parts[0]), month=Number(parts[1]);
    parts[2] = String(Math.min(Number(parts[2]), new Date(year,month,0).getDate())).padStart(2,'0'); setMomentDate(parts.join('-'));
  }
  async function remixMoment(entry: MomentRecord) {
    setWorking(true);
    try { const response = await fetch(photoSrc(entry.photo)); const blob = await response.blob(); const image = await readImageFile(new File([blob], 'memory.jpg', {type:blob.type || 'image/jpeg'}));
      const item: Inspiration = {id:`memory-${crypto.randomUUID()}`,title:entry.title,artist:'',image:image.data,palette:image.palette,source:'upload',color:'',style:'',tags:[],note:'Colors from a manicure you wore.'};
      setData(d=>({...d,uploads:[item,...d.uploads]})); useSource(item);
    } catch { setToast({text:'This photo could not be used. Try importing it from your photos.'}); } finally { setWorking(false); }
  }
  const dateLabel = (value:string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const visibleIdeas = allIdeas.filter(item => {
    const inSaved = (route === 'saved' && savedSpace === 'library') || (route === 'source' && sourceTab === 'saved');
    return (route !== 'saved' || savedSpace !== 'community' || item.source !== 'upload') && (!inSaved || data.savedIds.includes(item.id)) && (route !== 'saved' || savedSpace === 'community' || activeFolder === 'all' || data.membership[item.id] === activeFolder) && (styleFilter === 'All' || item.style === styleFilter) && `${item.title} ${item.artist} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
  });
  function IdeaCard({ item, choosing = false }: { item: Inspiration; choosing?: boolean }) { const saved = data.savedIds.includes(item.id); return <article className="nm-idea"><button className="nm-idea-main" aria-label={`${choosing ? 'Apply' : 'Open'} ${item.title}`} onClick={() => { if (choosing) applySource(item); else { setPost(item); go('post'); } }}><div className="nm-cut-photo"><img src={photoSrc(inspirationPreview(item,rootTab==='saved'))} alt={`${item.title} nail inspiration`} draggable={false} />{choosing && <span className="nm-apply-corner"><ArrowUpRight size={18} /></span>}</div><h3>{item.title}</h3><p>{item.source === 'upload' ? 'From your photos' : `@${item.artist}`}</p></button>{!choosing && <button className={`nm-heart ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${item.title}`} aria-pressed={saved} onClick={() => saved ? unsave(item) : askSave(item)}><Heart size={28} weight={saved ? 'fill' : 'regular'} /></button>}{route === 'saved' && savedSpace === 'library' && <button className="nm-folder-label" aria-label={`Move ${item.title} to another folder`} onClick={() => askSave(item)}><FolderSimple size={13} />{folderLabel(data.membership[item.id])}</button>}</article>; }
  function renderScene(hero = false, interactive = true, viewPose: HandPose = pose) { return <div className={`nm-scene ${hero ? 'hero' : ''}`} data-scroll-drag="ignore"><HandScene ref={sceneRef} nails={hero && !data.draft ? nailsFromInspiration(inspirations[0]) : project.nails} skinTone={hand.skinTone} handedness={hand.side} selectedNail={isEditor ? selectedNail : null} onSelectNail={isEditor ? selectNail : undefined} interactive={interactive} onMoveElement={isEditor?moveDetail:undefined} pose={viewPose} resetViewKey={interactive ? poseResetKey : undefined} onReady={() => setSceneReady(true)} onError={() => setRenderFailed(true)} />{renderFailed && <div className="nm-render-fallback"><img src={source ? photoSrc(inspirationPreview(source)) : hand.photo} alt="Reference photo, not a rendered 3D preview" /><p>3D is unavailable. This is your reference photo. Your design settings can still be saved.</p></div>}</div>; }
  function Topbar({ title, step, action }: { title: string; step?: string; action?: ReactNode }) { return <header className="nm-topbar"><button className="nm-icon" aria-label="Go back" onClick={back}><ArrowLeft size={22} /></button><div><strong>{title}</strong>{step && <small>{step}</small>}</div>{action ?? <span className="nm-toolbar-space" />}</header>; }
  const fields = <div className="nm-search"><MagnifyingGlass size={18} /><KeyboardInput aria-label="Search inspiration" placeholder="A color, a mood, an artist…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && keyboard.hide()} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button>}<button aria-label="Filter inspiration" className={styleFilter !== 'All' ? 'active' : ''} onClick={() => openSheet('filter')}><SlidersHorizontal size={20} /></button></div>;
  const recipe = <div className="v2-summary"><h2>Design details</h2>{designSummary(project).map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;

  return <main ref={appRoot} onBlurCapture={e=>{const next=e.relatedTarget as HTMLElement|null;if((pointerAction.current||next?.closest('button'))&&isKeyboardVisible)return;if(!next?.matches('textarea,input:not([type="range"]):not([type="file"]):not([type="color"])'))keyboard.hide();}} className={`nm-app ${isEditor ? `is-editor ${studioPanel==='edit'?'is-tuning':''}` : ''} ${route==='moments'?'is-moments':''} ${isKeyboardVisible ? 'keyboard-open' : ''}`} style={rootStyle} onPointerDownCapture={e=>{
      editGroup.current=crypto.randomUUID();
      const target=e.target as HTMLElement;
      pointerAction.current=!!target.closest('button');
      if(pointerAction.current&&!target.closest('.bottom-sheet')&&document.activeElement?.matches('textarea,input:not([type="range"]):not([type="file"])'))e.preventDefault();
    }} onClickCapture={e=>{if(!(e.target as HTMLElement).closest('.bottom-sheet')&&(e.target as HTMLElement).closest('button')&&isKeyboardVisible)keyboard.hide();}} onPointerUpCapture={()=>{editGroup.current=undefined;window.setTimeout(()=>{pointerAction.current=false;if(!document.activeElement?.closest('.bottom-sheet')&&!document.activeElement?.matches('textarea,input:not([type="range"]):not([type="file"])'))keyboard.hide();},0);}} onPointerCancelCapture={()=>{pointerAction.current=false;editGroup.current=undefined;keyboard.hide();}}>
    <input type="file" hidden accept="image/*" ref={handInput} onChange={chooseHand} />
    <input type="file" hidden accept="image/*" ref={inspirationInput} onChange={chooseInspirationPhoto} />
    <input type="file" hidden accept="image/*" capture="environment" ref={handCameraInput} onChange={chooseHand} />
    <input type="file" hidden accept="image/*" ref={momentInput} onChange={chooseMomentPhoto} />
    <input type="file" hidden accept="image/*" ref={tryOnInput} onChange={chooseTryOnPhoto} />
    {!ready && <div className="nm-boot" aria-label="Opening your studio"><Brand /></div>}
    {ready && route === 'onboarding' && <div className="nm-onboarding">
      <header><Brand /></header>
      <div className="nm-onboarding-hand">{renderScene(false,false,'fan')}</div>
      <div className="nm-onboarding-copy"><h1>Your hands.<br/>Your own way.</h1><Button onClick={()=>go('setup')}>Start designing<ArrowRight size={19}/></Button><button className="nm-text-button" onClick={startDemo}>Try with the sample hand</button><small>Sample 3D hand · photos are used as references</small></div>
    </div>}
    {ready && route === 'setup' && <><Topbar title="Your hand" action={<button className="nm-icon" aria-label="Hand photo tips" onClick={()=>openSheet('about')}><Info size={20}/></button>}/><MobileScroll className="nm-flow-scroll"><div className="nm-capture-content">
      <h1>Start with your hand.</h1><p>Palm down. Fingers apart. A little good light.</p><div className="nm-capture-photo"><img src={data.hand?.photo ?? '/assets/sample-hand.png'} alt="Hand photo guide, palm down and fingers apart"/><span>{data.hand ? 'YOUR REFERENCE' : 'PHOTO GUIDE'}</span></div>
      <Button onClick={()=>handCameraInput.current?.click()} disabled={working}><Camera size={20}/>Take a hand photo</Button><button className="nm-capture-library" onClick={()=>handInput.current?.click()}><ImageSquare size={18}/>Choose from photos</button><button className="nm-text-button" onClick={useSampleHand}>Use the sample hand<ArrowRight size={16}/></button><small className="nm-privacy"><LockSimple size={12}/>Kept on this device. Sample 3D model in this demo.</small>
    </div></MobileScroll></>}
    {(route === 'scanning' || route === 'applying') && <div className="nm-hand-transition" role="status" aria-live="polite"><div className="nm-transition-photo"><img src={route === 'scanning' ? hand.photo : photoSrc(post.image)} alt="Your selected hand reference"/><div className="nm-scan-line"/></div><div className="nm-transition-copy"><span className="nm-spinner"/><h2>{route === 'scanning' ? 'Making room for you.' : 'Trying something new.'}</h2><span>Preparing the sample 3D canvas</span></div></div>}
    {isRoot && route !== 'home' && route !== 'moments' && <PageHeader className="app-root-header" title="Saved" actions={<button className="nm-icon" aria-label="Your hand and prototype information" onClick={()=>openSheet('profile')}><DotsThree size={25}/></button>}/>}
    {ready && isEditor && <>
      <div className={`nm-studio-canvas ${arrival ? 'arriving' : ''}`}>{renderScene()}</div>
      <PageHeader className="app-studio-header" title="Studio" onTitlePress={()=>openSheet('profile')} actions={<button className="v3-import" aria-label="Upload a nail photo" onClick={()=>startUpload('source')}><UploadSimple size={21}/><span>Import</span></button>}/>
      {studioPanel===null&&<PoseKnob pose={pose} onChange={setPose} onOpen={()=>keyboard.hide()} onReset={()=>{setPose('fan');setPoseResetKey(k=>k+1);}}/>}
      {studioPanel==='edit'&&<button className="v4-reset-view" aria-label="Reset hand view" onClick={()=>sceneRef.current?.resetView()}><ArrowsClockwise size={19}/></button>}
      {studioPanel==='edit'&&<div className="nm-canvas-selection"><button aria-label={`Choose nails to edit: ${selectedNail===null?'All nails':fingers[selectedNail]}`} onClick={()=>openSheet('fingers')}><HandPalm size={15}/>{selectedNail===null?'All nails':fingers[selectedNail]}<CaretDown size={12}/></button><span className="v2-zoom"><button aria-label="Zoom out" onClick={()=>sceneRef.current?.zoomBy(1/1.15)}><MagnifyingGlassMinus size={20}/></button><button aria-label="Zoom in" onClick={()=>sceneRef.current?.zoomBy(1.15)}><MagnifyingGlassPlus size={20}/></button></span></div>}
      {(history.past.length>0||history.future.length>0)&&<div className="v2-history"><button className="nm-icon" aria-label="Undo change" disabled={!history.past.length} onClick={()=>dispatch({type:'undo'})}><ArrowCounterClockwise size={20}/></button><button className="nm-icon" aria-label="Redo change" disabled={!history.future.length} onClick={()=>dispatch({type:'redo'})}><ArrowClockwise size={20}/></button></div>}
      <div className="v3-capture-dock"><button className="v3-dock-action" aria-label="Save design" disabled={!sceneReady&&!renderFailed} onClick={reviewSet}><span><BookmarkSimple size={23}/></span><small>Save</small></button><button className="v3-try-on" aria-label="View it on my hand" onClick={()=>openSheet('arIntro')}><span><Camera size={28}/></span><strong>View on my hand</strong></button><button className="v3-dock-action" aria-label={studioPanel==='edit'?'Close editing tools':'Edit nail design'} aria-expanded={studioPanel==='edit'} onClick={()=>setStudioPanel(studioPanel==='edit'?null:'edit')}><span>{studioPanel==='edit'?<Check size={23}/>:<SlidersHorizontal size={23}/>}</span><small>{studioPanel==='edit'?'Done':'Edit'}</small></button></div>
      {studioPanel===null&&<p className="v3-current-look">{source?.title??project.name}</p>}
      {studioPanel==='edit'&&<section className={`nm-studio-tools tool-${tool}`} aria-label="Nail editing tools"><div className="v3-edit-heading"><button aria-label="Browse design inspiration" onClick={()=>{sourceTarget.current='replace';setSourceTab('ideas');setQuery('');setStyleFilter('All');go('source');}}>{source?.title??'Your design'}<CaretDown size={12}/></button><button onClick={startNew}><Plus size={14}/>New</button></div><div className="nm-studio-tool-tabs">{(['color','shape','length','finish','details'] as const).map(t=><button key={t} aria-pressed={tool===t} onClick={()=>{setTool(t);setSelectedElement(null);}}>{t==='color'?<Palette size={17}/>:t==='shape'?<HandPalm size={17}/>:t==='length'?<Ruler size={17}/>:t==='finish'?<CircleHalf size={17}/>:<Sparkle size={17}/>}<span>{t[0].toUpperCase()+t.slice(1)}</span></button>)}</div>
        {tool==='color'&&<><Carousel ariaLabel="Quick colors" className="nm-studio-color-carousel" contentClassName="nm-studio-color-track">{studioColors.map(c=><button key={c.color} className={`nm-color ${selectedColor?.toLowerCase()===c.color.toLowerCase()?'chosen':''}`} style={{'--swatch':c.color} as CSSProperties} aria-label={`Base color: ${c.name}`} aria-pressed={selectedColor?.toLowerCase()===c.color.toLowerCase()} onClick={()=>changeNails(n=>({...n,color:c.color}))}>{selectedColor?.toLowerCase()===c.color.toLowerCase()&&<Check size={15}/>}</button>)}</Carousel>{selectedNail===null&&!uniformColors&&<span className="v2-mixed-colors">Mixed colors</span>}<ColorPicker color={currentNail.color} onChange={color=>changeNails(n=>({...n,color}))}/></>}
        {tool==='shape'&&<div className="v2-shapes">{(['almond','round','square','coffin'] as const).map(v=><button key={v} aria-pressed={!mixedNails('shape')&&currentNail.shape===v} onClick={()=>changeNails(n=>({...n,shape:v}))}><ShapeIcon shape={v}/><span>{v}</span></button>)}</div>}
        {tool==='length'&&<div className="v2-length"><label htmlFor="nail-length">Length <span>{mixedNails('length')?'Mixed lengths':`${Math.round(currentNail.length*100)}%`}</span></label><input id="nail-length" aria-label="Nail length" type="range" min={0} max={1} step={.005} value={currentNail.length} onChange={e=>changeNails(n=>({...n,length:Number(e.target.value)}))}/><div><span>Short</span><span>Long</span></div></div>}
        {tool==='finish'&&<div className="v2-finishes">{(['gloss','chrome','matte'] as const).map(v=><button key={v} aria-pressed={!mixedNails('finish')&&currentNail.finish===v} onClick={()=>changeNails(n=>({...n,finish:v}))}><i className={v}/><span>{v}</span></button>)}</div>}
        {tool==='details'&&<><div className="nm-studio-detail-add">{(['star','heart','pearl','flower'] as const).map(k=>{const Icon=elementIcons[k];return <button key={k} aria-label={`Add or drag ${k} onto a nail`} onPointerDown={e=>detailPointer(e,k,'start')} onPointerMove={e=>detailPointer(e,k,'move')} onPointerUp={e=>detailPointer(e,k,'end')} onPointerCancel={e=>detailPointer(e,k,'end')} onClick={e=>{if(e.detail===0)addElement(k);}}><Icon size={24}/><span>{k}</span></button>;})}</div><div className="v2-detail-caption"><span>Tap to add · drag to place</span><button disabled={!currentElements.length} onClick={()=>{setSelectedElement(currentElement?.id??currentElements[0]?.id??null);setDetailHint(v=>!v);}}>Adjust <CaretRight size={12}/></button></div>{detailHint&&currentElements.length>0&&<><Carousel ariaLabel="Details on this nail" className="v2-detail-pick" contentClassName="v2-detail-pick-track">{currentElements.map((e,i)=><button key={e.id} aria-pressed={selectedElement===e.id} onClick={()=>setSelectedElement(e.id)}>{e.kind} {i+1}</button>)}</Carousel>{currentElement&&<div className="v2-detail-controls"><button onClick={()=>openSheet('detailEdit')}><SlidersHorizontal size={16}/>Position</button><button onClick={()=>changeElement({rotation:currentElement.rotation+30})}><ArrowClockwise size={16}/>Rotate</button><button onClick={()=>changeElement({scale:currentElement.scale>=1.8?.5:currentElement.scale+.15})}><MagnifyingGlassPlus size={16}/>Size</button><button onClick={removeElement}><Trash size={16}/>Remove</button></div>}</>}</>}
      </section>}
    </>}
    {route==='moments' && <Moments focusId={momentFocus} onFocusConsumed={()=>setMomentFocus(null)} moments={data.moments} onAdd={beginMoment} onUpdate={entry=>setData(d=>({...d,moments:d.moments.map(m=>m.id===entry.id?entry:m)}))} onDelete={entry=>{setData(d=>({...d,moments:d.moments.filter(m=>m.id!==entry.id)}));setToast({text:'Moment removed',undo:()=>setData(d=>({...d,moments:[...d.moments,entry]}))});}} onRemix={remixMoment}/>}
    {route==='momentForm' && <><Topbar title="A new moment"/><MobileScroll className="nm-flow-scroll nm-review-scroll"><div className="nm-memory-form"><button className={`nm-memory-photo-input ${momentPhoto?'has-photo':''}`} onClick={()=>momentInput.current?.click()} aria-label={momentPhoto?'Change manicure photo':'Add a photo of your manicure'} aria-describedby={momentError&&!momentPhoto?'memory-photo-error':undefined}>{momentPhoto?<><img src={photoSrc(momentPhoto)} alt="Your manicure memory"/><span><Camera size={15}/>Change photo</span></>:<><Camera size={31}/><strong>The set you wore.</strong><span>Add a photo from your camera roll</span><i><Plus size={18}/></i></>}</button>{momentError&&!momentPhoto&&<p id="memory-photo-error" className="nm-form-error" role="alert">{momentError}</p>}<label className="nm-form-label">Title<KeyboardInput aria-label="Memory title" aria-invalid={!!momentError&&!!momentPhoto&&!momentTitle.trim()} aria-describedby={momentError&&!!momentPhoto?'memory-field-error':undefined} value={momentTitle} maxLength={50} placeholder="e.g. Birthday gloss" onChange={e=>{setMomentTitle(e.target.value);setMomentError('');}} onKeyDown={e=>e.key==='Enter'&&keyboard.hide()}/></label><label className="nm-form-label">When did you wear it?</label><div className="nm-memory-date">{[0,1,2].map((part)=><select key={part} aria-label={['Memory year','Memory month','Memory day'][part]} value={momentDate.split('-')[part]} onChange={e=>changeMemoryDate(part,e.target.value)}>{part===0?Array.from({length:20},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>):part===1?Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={String(m).padStart(2,'0')}>{new Date(2000,m-1,1).toLocaleDateString('en-US',{month:'short'})}</option>):Array.from({length:new Date(Number(momentDate.slice(0,4)),Number(momentDate.slice(5,7)),0).getDate()},(_,i)=>i+1).map(d=><option key={d} value={String(d).padStart(2,'0')}>{d}</option>)}</select>)}</div><label className="nm-form-label">Occasion</label><Carousel ariaLabel="Memory occasion" className="nm-memory-occasions" contentClassName="nm-folder-track">{['Everyday','Birthday','A little treat','Holiday','Big night'].map(v=><Chip key={v} active={momentOccasion===v} onClick={()=>setMomentOccasion(v)}>{v}</Chip>)}</Carousel><label className="nm-form-label">Note<KeyboardTextarea aria-label="Memory note" placeholder="The color, the day, the feeling…" maxLength={200} rows={3} value={momentNote} onChange={e=>setMomentNote(e.target.value)}/></label>{momentError&&!!momentPhoto&&<p id="memory-field-error" className="nm-form-error" role="alert">{momentError}</p>}<p className="nm-demo-note">For manicures you wore in real life. Your photo is also kept in Saved.</p></div></MobileScroll><footer className="nm-fixed-action"><Button onClick={saveMoment}><ClockCounterClockwise size={19}/>Save moment</Button></footer></>}
    {route==='moment' && moment && <><Topbar title={isNewMemory?'Moment, kept.':'Your moment'} action={<button className="nm-icon" aria-label="Memory actions" onClick={()=>openSheet('momentActions')}><DotsThree size={25}/></button>}/><MobileScroll className="nm-flow-scroll nm-review-scroll"><article className="nm-memory-detail"><div className="nm-memory-detail-photo"><img src={photoSrc(moment.photo)} alt={moment.title}/>{moment.isDemo&&<span>Sample memory</span>}</div><time dateTime={moment.date}>{dateLabel(moment.date)}</time><h1>{moment.title}</h1>{moment.occasion&&<span className="nm-memory-occasion">{moment.occasion}</span>}{moment.note&&<p className="nm-memory-note">{moment.note}</p>}<button className="nm-memory-remix" onClick={()=>remixMoment(moment)}><Palette size={20}/><span><strong>Love these colors again?</strong><small>Bring the palette into Studio</small></span><ArrowUpRight size={19}/></button><p className="nm-demo-note">A real-life memory. {moment.isDemo?'This sample shows how your diary can look.':'Kept on this device, just for you.'}</p></article></MobileScroll><footer className="nm-fixed-action"><Button tone="light" onClick={()=>root('moments')}>Back to Moments<ArrowRight size={18}/></Button></footer></>}

    {(route === 'source' || route === 'inspiration') && <><Topbar title={route === 'source' ? 'Import a look' : 'Browse inspiration'} /><MobileScroll className="nm-flow-scroll"><div className="nm-library-content"><button className="nm-upload-tile" onClick={() => startUpload('source')}><span><UploadSimple size={24} /></span><div><strong>Import from photos</strong><small>A screenshot, a saved look, anything.</small></div><ArrowUpRight size={20} /></button>{route === 'source' && <div className="nm-tabs"><button aria-pressed={sourceTab === 'ideas'} onClick={() => { setSourceTab('ideas'); setQuery(''); }}>Try a starting point</button><button aria-pressed={sourceTab === 'saved'} onClick={() => { setSourceTab('saved'); setQuery(''); }}>From Saved</button></div>}{fields}{styleFilter !== 'All' && <div className="nm-active-filter"><span>{styleFilter}</span><button onClick={() => setStyleFilter('All')}>Clear filter<X size={12} /></button></div>}<div className="nm-results-label"><span>{visibleIdeas.length} IDEAS TO MAKE YOURS</span>{route === 'source' && <span>Tap one to apply<ArrowUpRight size={12} /></span>}</div>{visibleIdeas.length ? <div className="nm-ideas-grid">{visibleIdeas.map(item => <IdeaCard key={item.id} item={item} choosing={route === 'source'} />)}</div> : <div className="nm-empty"><FolderSimple size={36} /><h2>A little room for ideas.</h2><p>Try another search, or bring in a photo.</p><Button onClick={() => { setQuery(''); setStyleFilter('All'); }}>Clear search & filters</Button></div>}</div></MobileScroll></>}

    {(route === 'review' || route === 'project') && <><Topbar title={route === 'review' ? savedSuccess ? 'Saved to Studio drafts' : 'The set you made' : 'Saved design'} action={<button className="nm-icon" aria-label="Saved look actions" onClick={() => openSheet('lookActions')}><Info size={21} /></button>} /><MobileScroll className="nm-flow-scroll nm-review-scroll"><div className="nm-flow-content"><h1>{route === 'review' ? savedSuccess ? 'Saved to Studio drafts.' : 'Your set.' : project.name}</h1><div className="nm-review-stage">{route === 'review' && project.preview ? <img src={project.preview} alt="Your customized 3D manicure" />  : renderScene()}<span className="nm-stage-chip">{savedSuccess ? <CheckCircle size={14} /> : <Sparkle size={14} />}{savedSuccess ? 'SAVED DESIGN' : 'MADE YOURS'}</span></div>{route === 'review' && <label className="nm-name-label">Give your set a name<KeyboardInput aria-label="Name your set" value={project.name} maxLength={48} onChange={e => editProject({ ...project, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && keyboard.hide()} /></label>}{recipe}{source && <button className="nm-source-credit" onClick={() => { setPost(source); go('post'); }}><img src={photoSrc(inspirationPreview(source))} alt="Design starting point on your hand" /><span><small>THE STARTING POINT</small><strong>{source.title}</strong><small>{source.source === 'upload' ? 'From your photos' : `Original by @${source.artist}`}</small></span><ArrowUpRight size={19} /></button>}<button className="nm-download" onClick={downloadRecipe}><DownloadSimple size={19} />Download your salon reference</button><button className="nm-text-button" onClick={() => { setSelectedNail(null); go('editor'); }}>Continue editing<ArrowRight size={16} /></button></div></MobileScroll><footer className="nm-fixed-action"><Button tone="aqua" onClick={() => { if (route === 'project') go('editor'); else if (savedSuccess) { root('home');openSheet('drafts'); } else saveSet(); }}>{route === 'project' ? 'Edit design' : savedSuccess ? 'View Studio drafts' : 'Save design'}{savedSuccess && route === 'review' ? <Check size={19} /> : <ArrowUpRight size={19} />}</Button></footer></>}

    {route === 'post' && <><Topbar title={post.source === 'upload' ? 'Your inspiration' : 'The starting point'} action={<button className="nm-icon" aria-label={data.savedIds.includes(post.id) ? 'Choose folder for this inspiration' : 'Save this inspiration'} onClick={() => askSave(post)}><Heart size={23} weight={data.savedIds.includes(post.id) ? 'fill' : 'regular'} /></button>} /><MobileScroll className="nm-flow-scroll nm-review-scroll"><div className="nm-post-content"><div className="nm-post-photo"><img src={photoSrc(inspirationPreview(post,rootTab==='saved'))} alt={`${post.title} manicure reference`} /></div><span className="nm-kicker">{post.source === 'upload' ? 'FROM YOUR PHOTOS' : `CREATED BY @${post.artist}`}</span><h1>{post.title}</h1><p>{post.note ?? 'A little inspiration for the next set you make your own.'}</p><div className="nm-tag-row">{post.tags.map(t => <span key={t}>{t}</span>)}</div>{data.savedIds.includes(post.id) && <button className="nm-folder-label" onClick={() => askSave(post)}><FolderSimple size={16} />Saved in {folderLabel(data.membership[post.id])}<CaretRight size={14} /></button>}<p className="nm-demo-note">Curated demo styles are starting templates. Photo uploads bring in a palette, rather than reproduce every detail.</p></div></MobileScroll><footer className="nm-fixed-action"><Button tone="aqua" onClick={() => useSource(post)}>Make it mine in Studio<ArrowUpRight size={19} /></Button></footer></>}

    {route === 'saved' && <Saved data={data} space={savedSpace} onSpace={space=>{keyboard.hide();setSavedSpace(space);setQuery('');setStyleFilter('All');}} tab={savedTab} onTab={tab=>{keyboard.hide();setSavedTab(tab);setQuery('');}} activeFolder={activeFolder} onFolder={setActiveFolder} onNewFolder={()=>newFolder('saved')} ideas={visibleIdeas} renderIdea={item=><IdeaCard key={item.id} item={item}/>} search={fields} onUpload={()=>startUpload('saved')} onUploadTryOn={()=>tryOnInput.current?.click()} onPhoto={photo=>{setSelectedTryOn(photo);openSheet('tryOn');}}/>}

    {isRoot && <nav className={`nm-bottom-nav ${isKeyboardVisible ? 'hidden' : ''}`} aria-label="Main navigation"><button aria-current={route==='home'?'page':undefined} onClick={()=>root('home')}><Sparkle size={23} weight={route==='home'?'fill':'regular'}/><span>Studio</span></button><button aria-current={route==='saved'?'page':undefined} onClick={()=>root('saved')}><BookmarkSimple size={22} weight={route==='saved'?'fill':'regular'}/><span>Saved</span></button><button aria-current={route==='moments'?'page':undefined} onClick={()=>root('moments')}><ClockCounterClockwise size={23} weight={route==='moments'?'fill':'regular'}/><span>Moments</span></button></nav>}

    <BottomSheet open={sheet !== null} onOpenChange={open => { if (!open) closeSheet(); }} title={sheet==='drafts'?'Studio drafts':sheet==='tryOn'?'My try-on photo':sheet==='arIntro'?'Preview on your hand':sheet==='discard'?'Keep your current design?':sheet === 'fingers' ? 'Choose your canvas' : sheet === 'finish' ? 'Finish' : sheet === 'length' ? 'Length' : sheet === 'detailEdit' ? `${fingers[elementNail]} details` : sheet === 'newSet' ? 'A fresh canvas' : sheet === 'momentActions' ? 'Your memory' : sheet === 'about' ? 'A little about this demo' : sheet === 'profile' ? 'Your personal canvas' : sheet === 'folder' ? 'Find it a home' : sheet === 'newFolder' ? 'A home for your ideas' : sheet === 'upload' ? 'Inspiration from your photos' : sheet === 'filter' ? 'Find your next starting point' : sheet === 'export' ? 'Your salon reference' : 'Your saved look'} description={sheet === 'folder' ? pendingSave?.title : sheet === 'newFolder' ? 'A next appointment, a mood, or anything you like.' : undefined} snap={sheet==='drafts'||sheet==='tryOn'?.85:sheet === 'detailEdit' ? .58 : sheet === 'fingers' ? .6 : sheet === 'export' ? .9 : sheet === 'upload' ? .87 : sheet === 'folder' ? .78 : sheet === 'newFolder' ? .64 : .64}><div className="nm-sheet">
      {sheet==='drafts'&&<><p className="nm-body-copy">Your editable 3D designs. Real photos live in Saved.</p><div className="v4-draft-grid">{data.projects.map(p=><button key={p.id} onClick={()=>protectDraft(()=>{dispatch({type:'load',value:structuredClone(p)});setSessionStarted(true);setSelectedNail(null);setSavedSuccess(true);root('home');})}>{p.preview?<img src={p.preview} alt={`${p.name}, 3D draft`}/>:<span><Cube size={30}/></span>}<strong>{p.name}</strong><small>Editable 3D design</small></button>)}</div>{!data.projects.length&&<p className="v4-quiet-empty">Save a design in Studio to keep editing it later.</p>}</>}
      {sheet==='tryOn'&&selectedTryOn&&<><img className="v4-own-photo" src={photoSrc(selectedTryOn.image)} alt={selectedTryOn.title}/><h2>{selectedTryOn.title}</h2><p className="nm-body-copy">{selectedTryOn.date} · Your real hand photo</p><Button tone="aqua" onClick={()=>reuseTryOn(selectedTryOn)}><Palette size={18}/>Use these colors in Studio</Button><a className="nm-text-button" href={photoSrc(selectedTryOn.image)} download="my-try-on.jpg"><DownloadSimple size={17}/>Download photo</a></>}
      {sheet==='fingers' && <><div className="nm-finger-options"><button aria-pressed={selectedNail===null} onClick={()=>{selectNail(null);closeSheet();}}><HandPalm size={20}/>All nails{selectedNail===null&&<Check size={17}/>}</button>{fingers.map((f,i)=><button key={f} aria-pressed={selectedNail===i} onClick={()=>{selectNail(i);closeSheet();}}><i style={{background:project.nails[i].color}}/>{f}{selectedNail===i&&<Check size={17}/>}</button>)}</div>{selectedNail!==null&&<button className="nm-sheet-row" onClick={()=>{copyToAll();closeSheet();}}><Copy size={19}/>Copy this nail to all<ArrowRight size={17}/></button>}</>}
      {sheet==='finish' && <div className="nm-choice-options">{(['gloss','chrome','matte'] as const).map(v=><button key={v} aria-pressed={!mixedNails('finish')&&currentNail.finish===v} onClick={()=>{changeNails(n=>({...n,finish:v}));closeSheet();}}><span>{v}</span>{currentNail.finish===v&&<Check size={19}/>}</button>)}</div>}
      {sheet==='length'&&<input type="range" min={0} max={1} step={.005} aria-label="Nail length" value={currentNail.length} onChange={e=>changeNails(n=>({...n,length:Number(e.target.value)}))}/>}
      {sheet==='newSet' && <><p className="nm-body-copy">Your saved designs will be here when you need them.</p><Button onClick={()=>{closeSheet();startNew();}}>Start a fresh set<Plus size={18}/></Button><button className="nm-text-button" onClick={closeSheet}>Keep editing this one</button></>}
      {sheet==='detailEdit'&&<>{currentElement?<><p className="v2-compact-hint">Move this detail with a tap, or drag it directly on the nail.</p><output className="v2-position-value" aria-live="polite">{Math.round((currentElement.x+.7)/1.4*100)}% across · {Math.round((currentElement.y+.85)/1.7*100)}% up</output><div className="v2-position-grid" role="group" aria-label="Detail position"><button onClick={()=>changeElement({y:Math.min(.85,currentElement.y+.08)})}>Up</button><button onClick={()=>changeElement({x:Math.max(-.7,currentElement.x-.08)})}>Left</button><button onClick={()=>changeElement({x:0,y:.05})}>Center</button><button onClick={()=>changeElement({x:Math.min(.7,currentElement.x+.08)})}>Right</button><button onClick={()=>changeElement({y:Math.max(-.85,currentElement.y-.08)})}>Down</button></div><div className="v2-detail-controls"><button onClick={()=>changeElement({rotation:currentElement.rotation+30})}><ArrowClockwise size={18}/>Rotate</button><button onClick={()=>changeElement({scale:Math.min(1.8,currentElement.scale+.15)})}><MagnifyingGlassPlus size={18}/>Size</button><button onClick={removeElement}><Trash size={18}/>Remove</button></div></>:<p className="nm-body-copy">Select a detail on the nail.</p>}<button className="vm-editor-save" onClick={closeSheet}>Done</button></>}
      {sheet==='discard'&&<><p className="nm-body-copy">Save this design before starting another.</p><Button onClick={()=>{saveSet();closeSheet();const action=pendingTransition.current;pendingTransition.current=null;action?.();}}>Save and continue</Button><button className="nm-text-button" onClick={()=>{closeSheet();const action=pendingTransition.current;pendingTransition.current=null;action?.();}}>Continue without saving</button><button className="nm-text-button" onClick={closeSheet}>Keep editing</button></>}
      {sheet==='arIntro'&&<><div className="v2-ar-illustration"><Camera size={34}/><span>One hand in view.<br/>One thumb in control.</span></div><p className="nm-body-copy">Preview this design with your rear camera. AR adjusts all five nails together. Raised details are shown as flat artwork; chrome and unsupported shapes use an approximate preview. Your 3D design stays intact.</p><Button tone="aqua" onClick={()=>{setArMode('camera');closeSheet();go('ar');}}><Camera size={20}/>Start camera preview</Button><button className="nm-text-button" onClick={()=>{setArMode('controls');closeSheet();go('ar');}}>Explore controls without camera</button></>}

      {sheet==='momentActions' && moment && <><button className="nm-sheet-row" onClick={()=>{closeSheet();remixMoment(moment);}}><Palette size={20}/>Use these colors in Studio<ArrowUpRight size={17}/></button><button className="nm-sheet-row danger" onClick={()=>{const removed=moment;setData(d=>({...d,moments:d.moments.filter(m=>m.id!==removed.id)}));root('moments');setToast({text:'Memory removed',undo:()=>setData(d=>({...d,moments:[removed,...d.moments]}))});}}><Trash size={20}/>Remove memory</button></>}
      {sheet === 'about' && <><div className="nm-info-lead"><Cube size={32} /><h2>From a little inspiration<br />to a lot of you.</h2></div><p>This prototype explores a DIY-first nail studio. Rotate the 3D hand, edit individual nails, try styles, and save a set with a salon reference.</p><div className="nm-info-callout"><strong>What works here</strong><p>3D editing, color and shape changes, movable details, undo / redo, local uploads, folders, and saved sets.</p><strong>What is simulated</strong><p>A photo does not reconstruct your actual hand. The demo uses a sample model and curated styles; uploaded inspiration supplies a color palette. Explore shows curated examples.</p></div><Button onClick={closeSheet}>Let’s make something<ArrowRight size={18} /></Button></>}
      {sheet === 'profile' && <><div className="nm-profile-preview"><img src={hand.photo} alt="Your reference hand photo" /><span><strong>{data.hand ? 'Your hand reference' : 'Meet your canvas'}</strong><p>{data.hand ? `${hand.side} hand · saved on this browser` : 'A personal starting point for your next set.'}</p></span></div><Button onClick={() => { closeSheet(); go('setup'); }}><Camera size={19} />{data.hand ? 'Change my hand photo' : 'Set up my hand'}</Button><button className="nm-sheet-row" aria-label="Open Studio drafts" onClick={()=>openSheet('drafts')}><FloppyDisk size={20}/>Studio drafts<span className="v5-draft-count">{data.projects.length}</span><CaretRight size={17}/></button><button className="nm-sheet-row" onClick={()=>{closeSheet();go('onboarding');}}><HandPalm size={20}/>Replay the welcome<CaretRight size={17}/></button><div className="nm-profile-tones"><span>Hand tone</span><div>{skinTones.map(t=><button key={t.color} aria-label={`Hand tone: ${t.name}`} aria-pressed={hand.skinTone===t.color} style={{background:t.color}} onClick={()=>setData(d=>({...d,hand:{...hand,skinTone:t.color}}))}>{hand.skinTone===t.color&&<Check size={14}/>}</button>)}</div></div><div className="nm-inline-toggle"><span>Hand</span><div>{(['left','right'] as const).map(side=><button key={side} aria-pressed={hand.side===side} onClick={()=>setData(d=>({...d,hand:{...hand,side}}))}>{side}</button>)}</div></div><button className="nm-sheet-row" onClick={() => openSheet('about')}><Info size={20} />How this prototype works<CaretRight size={17} /></button><p className="nm-demo-note">Photos and designs stay in this browser. They do not sync between devices.</p></>}
      {sheet === 'folder' && <><div className="nm-folder-options"><button aria-pressed={folderChoice === 'all'} onClick={() => setFolderChoice('all')}><FolderSimple size={23} /><span><strong>All only</strong><small>Keep without a folder</small></span><span className="nm-radio">{folderChoice === 'all' && <Check size={12} />}</span></button>{data.folders.map(f => <button key={f.id} aria-pressed={folderChoice === f.id} onClick={() => setFolderChoice(f.id)}><FolderSimple size={23} /><span><strong>{f.name}</strong><small>{data.savedIds.filter(id => data.membership[id] === f.id).length} saved ideas</small></span><span className="nm-radio">{folderChoice === f.id && <Check size={12} />}</span></button>)}</div><button className="nm-sheet-row" onClick={() => newFolder('folder')}><FolderPlus size={21} />Create new folder<Plus size={17} /></button><Button onClick={confirmFolder}>Save here<ArrowRight size={18} /></Button></>}
      {sheet === 'newFolder' && <><label className="nm-form-label">Folder name<KeyboardInput aria-label="Folder name" placeholder="e.g. Birthday ideas" value={folderName} maxLength={32} onChange={e => { setFolderName(e.target.value); setFolderError(''); }} onKeyDown={e => e.key === 'Enter' && createFolder()} /></label><p className={`nm-form-help ${folderError ? 'error' : ''}`} role={folderError ? 'alert' : undefined}>{folderError || `${folderName.length}/32 · Make it yours.`}</p><Button onClick={createFolder}>Create folder<FolderPlus size={18} /></Button><button className="nm-text-button" onClick={cancelFolder}>Cancel</button></>}
      {sheet === 'upload' && uploadDraft && <><div className="nm-import-preview"><img src={photoSrc(uploadDraft.image)} alt="Selected inspiration photo" /></div><label className="nm-form-label">Give this idea a name<KeyboardInput aria-label="Inspiration name" value={uploadTitle} maxLength={60} onChange={e => setUploadTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && keyboard.hide()} /></label><div className="nm-extracted-palette"><span>PALETTE FROM YOUR PHOTO</span><div>{uploadDraft.palette?.map(c => <i key={c} style={{ background: c }} />)}</div></div><span className="nm-kicker">SAVE TO</span><Carousel ariaLabel="Photo destination folder" className="nm-photo-folder-carousel" contentClassName="nm-folder-track"><Chip active={folderChoice === 'all'} onClick={() => setFolderChoice('all')}>All</Chip>{data.folders.map(f => <Chip active={folderChoice === f.id} key={f.id} onClick={() => setFolderChoice(f.id)}>{f.name}</Chip>)}<Chip onClick={() => newFolder('upload')}><Plus size={15} />New folder</Chip></Carousel><Button onClick={confirmUpload} disabled={!uploadTitle.trim()}>{uploadContext === 'source' ? 'Use this palette in Studio' : 'Add inspiration'}<ArrowUpRight size={18} /></Button><p className="nm-demo-note">This demo extracts colors. It does not recreate every detail of the photo.</p></>}
      {sheet === 'filter' && <><p className="nm-body-copy">Find an idea to start with. You can change everything in Studio.</p><div className="nm-filter-grid">{['All', 'Chrome', 'French', 'Nail art', 'Minimal'].map(s => <Chip key={s} active={styleFilter === s} onClick={() => setStyleFilter(s)}>{s === 'All' ? 'Any style' : s}</Chip>)}</div><Button onClick={closeSheet}>Show my starting points<ArrowRight size={18} /></Button></>}
      {sheet === 'export' && exportImage && <><p className="nm-body-copy">Your design and its key details, ready to discuss.</p><img className="nm-export-preview" src={exportImage} alt="Salon reference with your design summary" /><a className="nm-button aqua nm-export-link" href={exportImage} download={`${project.name.replace(/[^a-z0-9 -]/gi, '').trim() || 'my-nail-set'}-recipe.png`}><span><DownloadSimple size={19} />Save reference image</span></a><p className="nm-demo-note">Keep it for yourself or bring it to your nail appointment.</p></>}
      {sheet === 'lookActions' && <><button className="nm-sheet-row" onClick={() => { closeSheet(); downloadRecipe(); }}><DownloadSimple size={21} />Download salon reference<ArrowUpRight size={18} /></button><button className="nm-sheet-row" onClick={() => { closeSheet(); go('editor'); }}><Sparkle size={21} />Continue editing<ArrowRight size={18} /></button>{data.projects.some(p => p.id === project.id) && <button className="nm-sheet-row danger" onClick={() => { const removed = project; setData(d => ({ ...d, projects: d.projects.filter(p => p.id !== project.id) })); root('home');openSheet('drafts'); setToast({ text: 'Draft removed', undo: () => setData(d => ({ ...d, projects: [removed, ...d.projects] })) }); }}><Trash size={21} />Remove saved look</button>}</>}
    </div></BottomSheet>
    {route==='ar'&&<ArSession skinTone={hand.skinTone} handedness={hand.side} project={project} mode={arMode} onSavePhoto={image=>{const photo:TryOnPhoto={id:`try-on-${crypto.randomUUID()}`,title:project.name,image,date:localDate()};setData(current=>({...current,tryOnPhotos:[photo,...current.tryOnPhotos]}));setToast({text:'Camera photo saved to My try-ons'});}} onClose={()=>{back();}} onApply={nails=>{editProject({...project,nails});back();setToast({text:'AR adjustments applied. Original design is available with Undo.'});}}/>}
    {dragGhost&&<span className="v2-drag-ghost" style={{left:dragGhost.x,top:dragGhost.y}}>{dragGhost.kind==='heart'?'♥':dragGhost.kind==='star'?'★':dragGhost.kind==='flower'?'✿':'●'}</span>}
    {working && <div className="nm-working" role="status"><span className="nm-spinner" />Opening your photo…</div>}
    {toast && <div className="nm-toast" role="status"><CheckCircle size={18} /><span>{toast.text}</span>{toast.undo && <button onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}</div>}
  </main>;
}
function LockIcon() { return <LockSimple size={13} />; }

function designSummary(project:StudioProject):[string,string][] {
  const values=(get:(n:NailAppearance)=>string,plural:string)=>{const v=[...new Set(project.nails.map(get))];return v.length===1?v[0]:`Mixed ${plural}`;};
  return [['Shape',values(n=>n.shape,'shapes')],['Length',values(n=>`${Math.round(n.length*100)}%`,'lengths')],['Color',values(n=>displayColor(n.color),'colors')],['Finish',values(n=>n.finish,'finishes')],['Style',[...new Set(project.nails.map(n=>n.pattern==='french'?'French':n.pattern==='swirl'?'Swirl':n.elements.length?'Decorated':'Solid'))].join(' · ')]];
}
