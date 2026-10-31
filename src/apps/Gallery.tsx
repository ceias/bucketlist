import { createId } from '../lib/id';
import { useEffect, useState } from 'react';
import { Camera, Upload, Heart, Trash2, X, Download, FolderHeart, Images, Search, Pencil, Check, StickyNote, CalendarDays, LoaderCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useData, emptyDraft, type Item } from '../stores/data';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { photoFileName, renamedPhoto } from '../lib/photos';
const albums = ['All memories','Our First Anniversary','Photobooth Memories','Food Crawls','Matching Outfits','Adventures','Little Moments'];
function Photo({ item, onClick }: { item: Item; onClick: () => void }) {
  const [url,setUrl] = useState(item.data.localUrl || '');
  const [failed,setFailed] = useState(false);
  useEffect(() => {
    let live = true; setFailed(false);
    if (item.data.path && supabase) supabase.storage.from('memories').createSignedUrl(item.data.path,3600).then(({data,error}) => { if(live) { if(data)setUrl(data.signedUrl);if(error)setFailed(true); } });
    else setUrl(item.data.localUrl || '');
    return () => { live = false; };
  }, [item.data.path,item.data.localUrl]);
  return <button className="photo-image" aria-label={`View ${item.title}`} onClick={onClick}>{url && !failed ? <img src={url} alt={item.title} onError={() => setFailed(true)}/> : <span className="photo-unavailable"><Camera size={30}/>{failed && <small>Photo unavailable. Try reopening.</small>}</span>}</button>;
}
function PhotoDetails({ item, onClose }: { item: Item; onClose: () => void }) {
  const save = useData(s => s.save);
  const [name,setName] = useState(photoFileName(item));
  const [notes,setNotes] = useState(item.body);
  const [album,setAlbum] = useState(item.category);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try { const current=useData.getState().items.find(i=>i.id===item.id) || item;await save(renamedPhoto(current,name,notes,album));setSaved(true); }
    catch(e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function download() {
    setError('');
    try {
      let blob: Blob;
      if(item.data.localUrl) blob=await (await fetch(item.data.localUrl)).blob();
      else { const {data,error}=await supabase!.storage.from('memories').download(item.data.path);if(error)throw error;blob=data; }
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=photoFileName(item);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e) { setError((e as Error).message); }
  }
  return <Modal className="photo-detail-backdrop" label="Edit memory" onClose={onClose} busy={busy}><section className="photo-detail"><div className="photo-detail-view"><div className="photo-detail-view-label"><Camera size={15}/>ONE LITTLE MOMENT, KEPT</div><Photo item={item} onClick={()=>{}}/><span>{format(parseISO(item.date),'MMMM d, yyyy')}</span><button className="button photo-download" onClick={download}><Download size={15}/>Download photo</button></div><form className="photo-detail-form" onSubmit={submit}><div className="section-heading"><div><span className="eyebrow">THE STORY BEHIND THE PHOTO</span><h2>Make this memory yours.</h2></div><button type="button" className="icon-button" aria-label="Close photo details" disabled={busy} onClick={onClose}><X size={20}/></button></div><label><Pencil size={14}/>Photo file name<input autoFocus value={name} maxLength={190} onChange={e=>{setName(e.target.value);setSaved(false);}} required/></label><p className="field-hint">This name is used in your gallery and when you download the photo. Its original image format is preserved.</p><label><FolderHeart size={14}/>Album<select aria-label="Album" value={album} onChange={e=>{setAlbum(e.target.value);setSaved(false);}}>{albums.slice(1).map(a=><option key={a}>{a}</option>)}{!albums.includes(album)&&<option>{album}</option>}</select></label><label><StickyNote size={14}/>A note for this memory<textarea aria-label="Photo notes" rows={6} maxLength={5000} value={notes} placeholder="Where we were. What made us laugh. The little things you want to remember…" onChange={e=>{setNotes(e.target.value);setSaved(false);}}/></label><div className="photo-details-stamp"><img src="/assets/notebook/together-stamp.svg" alt=""/><span>different days.<br/>same you.</span></div>{error&&<p className="error" role="alert">{error}</p>}<div className="photo-save-footer"><span aria-live="polite">{saved&&<><Check size={14}/>Memory updated</>}</span><button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Save changes</button></div></form></section></Modal>;
}
export function Gallery() {
  const {items,save,remove,mode,workspace,user}=useData();
  const [album,setAlbum]=useState('All memories');const [error,setError]=useState('');const [uploading,setUploading]=useState(false);const [viewId,setViewId]=useState<string|null>(null);const [favorite,setFavorite]=useState(false);const [search,setSearch]=useState('');const [sort,setSort]=useState('newest');
  const all=items.filter(i=>i.kind==='gallery'&&!i.deleted);
  const photos=all.filter(i=>(album==='All memories'||i.category===album)&&(!favorite||i.done)&&(i.title+' '+photoFileName(i)+' '+i.body).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):b.date.localeCompare(a.date));
  const view=all.find(i=>i.id===viewId);
  async function upload(file:File) {
    setError('');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){setError('Choose a JPEG, PNG, or WebP photograph under 8 MB.');return;}
    setUploading(true);let path:string|undefined;
    try {
      let data:Record<string,string>={fileName:file.name,mimeType:file.type};
      if(mode==='cloud') { path=`${workspace}/${user}/${createId()}.${file.type==='image/jpeg'?'jpg':file.type.split('/')[1]}`;const {error}=await supabase!.storage.from('memories').upload(path,file,{contentType:file.type});if(error)throw error;data.path=path; }
      else { if(file.size>2*1024*1024)throw Error('Local preview photos must be under 2 MB. Connect Supabase for larger uploads.');data.localUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Could not read this photograph.'));reader.readAsDataURL(file);}); }
      await save({...emptyDraft('gallery'),title:file.name.replace(/\.[^.]+$/,'').slice(0,200),category:album==='All memories'?'Little Moments':album,data});
    } catch(e) { if(path)await supabase?.storage.from('memories').remove([path]);setError((e as Error).message); }
    finally { setUploading(false); }
  }
  return <div className="gallery-layout"><aside className="gallery-albums"><span className="eyebrow">OUR LITTLE COLLECTION</span><h2><Images size={20}/>Albums</h2>{albums.map((a,index)=><button key={a} className={album===a&&!favorite?'selected':''} onClick={()=>{setAlbum(a);setFavorite(false);}}>{index===0?<Images size={16}/>:<FolderHeart size={16}/>}<span>{a}</span><small>{index===0?all.length:all.filter(i=>i.category===a).length}</small></button>)}<button className={favorite?'selected':''} onClick={()=>{setFavorite(!favorite);setAlbum('All memories');}}><Heart size={16}/><span>Our favorites</span><small>{all.filter(i=>i.done).length}</small></button><div className="album-bottom"><img src="/assets/notebook/love-letter.svg" alt=""/><p>The days go by.<br/>The memories stay.</p></div></aside>
    <div className="app-page gallery-page"><div className="section-heading"><div><span className="eyebrow">A COLLECTION OF US</span><h1>{favorite?'Our favorites':album==='All memories'?'Memory Gallery':album}</h1><p>Every photo has a story. Keep the little details, too.</p></div><label className="button primary upload-button"><Upload size={16}/>{uploading?'Tucking it away…':'Add a memory'}<input aria-label="Upload photograph" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);e.target.value='';}}/></label></div>
    <div className="collection-toolbar gallery-toolbar"><select aria-label="Photo album" value={album} onChange={e=>setAlbum(e.target.value)}>{albums.map(a=><option key={a}>{a}</option>)}</select><label className="search-input"><Search size={15}/><input aria-label="Search photos" placeholder="Find a name or a little note…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Sort photos" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="name">By file name</option></select><span className="gallery-count">{photos.length} memories</span></div>
    {error&&<p className="error" role="alert">{error}</p>}<div className="photo-grid">{photos.map(item=><article className="polaroid" key={item.id}><span className="polaroid-tape"/><Photo item={item} onClick={()=>setViewId(item.id)}/><div className="photo-caption"><h3>{item.title}</h3><button className={item.done?'favorited':''} aria-label={`Favorite ${item.title}`} aria-pressed={item.done} onClick={()=>save({...item,done:!item.done}).catch(e=>setError(e.message))}><Heart size={16} fill={item.done?'currentColor':'none'}/></button></div><span className="photo-filename">{photoFileName(item)}</span><p className={`photo-note-preview ${!item.body?'no-note':''}`}><StickyNote size={11}/>{item.body||'Add the story behind this moment…'}</p><div className="polaroid-footer"><span><CalendarDays size={11}/>{format(parseISO(item.date),'MMM d')}</span><button aria-label={`Edit ${item.title}`} onClick={()=>setViewId(item.id)}><Pencil size={12}/>Details</button><button aria-label={`Delete ${item.title}`} onClick={()=>remove(item.id).catch(e=>setError(e.message))}><Trash2 size={12}/></button></div></article>)}</div>
    {!photos.length&&<div className="empty-state"><FolderHeart size={42} strokeWidth={1}/><h2>{search?'No memories found.':'Good days belong here.'}</h2><p>{search?'Try another file name or note.':'A food crawl, a photobooth, an ordinary afternoon.\nUpload your first little memory.'}</p><img src="/assets/decorations/flower.svg" width="50" alt=""/></div>}
    <div className="gallery-tip"><Pencil size={14}/><span>Click any photo to rename it, write a note, or move it to another album.</span></div>{mode==='local'&&<p className="quiet-note">Local preview · photos stay in this browser. Connect Supabase for private shared storage.</p>}
    {view&&<PhotoDetails key={view.id} item={view} onClose={()=>setViewId(null)}/>}</div></div>;
}
