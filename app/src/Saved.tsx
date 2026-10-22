import type { ReactNode } from 'react';
import { ArrowRight, BookmarkSimple, Compass, FolderPlus, Globe, ImageSquare, LockSimple, Plus, UploadSimple } from '@phosphor-icons/react';
import { Carousel, MobileScroll } from './mobile';
import { personalTryOns, photoSrc, type Inspiration, type StudioData, type TryOnPhoto } from './studio-data';

type Props = {
  data: StudioData; space: 'library' | 'community'; onSpace: (space: 'library' | 'community') => void;
  tab: 'looks' | 'inspiration'; onTab: (tab: 'looks' | 'inspiration') => void;
  activeFolder: string; onFolder: (id: string) => void; onNewFolder: () => void;
  ideas: Inspiration[]; renderIdea: (item: Inspiration) => ReactNode; search: ReactNode;
  onUpload: () => void; onUploadTryOn: () => void; onPhoto: (photo: TryOnPhoto) => void;
};
export default function Saved({ data, space, onSpace, tab, onTab, activeFolder, onFolder, onNewFolder, ideas, renderIdea, search, onUpload, onUploadTryOn, onPhoto }: Props) {
  const photos = personalTryOns(data);
  return <>
    <div className="v4-saved-nav" role="group" aria-label="Saved spaces">
      <button aria-pressed={space === 'library'} onClick={() => onSpace('library')}><BookmarkSimple size={18}/>My library</button>
      <button aria-pressed={space === 'community'} onClick={() => onSpace('community')}><Globe size={18}/>Explore</button>
    </div>
    <MobileScroll className="v4-saved-scroll"><div className="v4-saved-content">
      {space === 'community' ? <>
        {search}
        <div className="nm-ideas-grid v4-inspiration-grid">{ideas.map(renderIdea)}</div>
        {!ideas.length && <p className="v4-quiet-empty">No ideas match your search. Try another color or style.</p>}
      </> : <>
        <button className="v4-upload" onClick={tab === 'looks' ? onUploadTryOn : onUpload}><span><UploadSimple size={22}/></span><div><strong>{tab === 'looks' ? 'Add my try-on photo' : 'Upload inspiration'}</strong><small>{tab === 'looks' ? 'A real photo of your own hand' : 'From your camera roll or screenshots'}</small></div><Plus size={20}/></button>
        <div className="v4-library-tabs" role="group" aria-label="My library collections"><button aria-pressed={tab === 'looks'} onClick={() => onTab('looks')}>My try-ons <span>{photos.length}</span></button><button aria-pressed={tab === 'inspiration'} onClick={() => onTab('inspiration')}>Inspiration <span>{data.savedIds.length}</span></button></div>
        {tab === 'looks' ? <>
          <p className="v4-collection-note">Your hand, in all its favorite poses.</p>
          {photos.length ? <div className="nm-looks-grid v4-photos">{photos.map(photo => <button className="nm-look" key={photo.id} onClick={() => onPhoto(photo)}><div><img src={photoSrc(photo.image)} alt={`${photo.title}, your real hand photo`}/></div><h3>{photo.title}</h3><p>{photo.date}</p></button>)}</div> : <div className="v4-library-empty"><span><ImageSquare size={32}/></span><h2>Your hand. Your tried looks.</h2><p>Add a photo of a manicure on your own hand. Different poses, all yours.</p><button onClick={onUploadTryOn}>Choose a photo <ArrowRight size={17}/></button></div>}
        </> : <>
          <div className="nm-folder-bar"><Carousel ariaLabel="Saved folders" className="nm-folder-carousel" contentClassName="nm-folder-track"><button className={`nm-chip ${activeFolder === 'all' ? 'active' : ''}`} aria-pressed={activeFolder === 'all'} onClick={() => onFolder('all')}>All</button>{data.folders.map(folder => <button className={`nm-chip ${activeFolder === folder.id ? 'active' : ''}`} aria-pressed={activeFolder === folder.id} key={folder.id} onClick={() => onFolder(folder.id)}>{folder.name}</button>)}</Carousel><button className="nm-icon" aria-label="Add folder" onClick={onNewFolder}><FolderPlus size={21}/></button></div>
          {search}<div className="nm-ideas-grid v4-inspiration-grid">{ideas.map(renderIdea)}</div>
          {!ideas.length && <div className="v4-library-empty"><BookmarkSimple size={30}/><h2>Room for your next idea.</h2><p>Upload a reference or save one from Explore.</p><button onClick={onUpload}>Upload inspiration <Plus size={17}/></button></div>}
        </>}
        <button className="v4-explore-link" onClick={() => onSpace('community')}><Compass size={22}/><span><strong>Explore others’ inspiration</strong><small>Community preview</small></span><ArrowRight size={18}/></button>
        <p className="v4-private-note"><LockSimple size={12}/>Your library stays private on this device.</p>
      </>}
    </div></MobileScroll>
  </>;
}
