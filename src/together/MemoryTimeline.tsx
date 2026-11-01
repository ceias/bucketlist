import { lazy,Suspense,useState } from 'react';
import { ArrowUpRight,BookHeart,CalendarDays,Camera,Star } from 'lucide-react';
import { format,parseISO } from 'date-fns';
import { useData,type Item } from '../stores/data';
import { useWindows } from '../stores/windows';
import { MemoryPhoto } from '../components/MemoryPhoto';
import { Creator } from './components';
const PhotoDetails=lazy(()=>import('../apps/Gallery').then(m=>({default:m.PhotoDetails})));
export function MemoryTimeline({memories,month}:{memories:Item[];month:string}){
 const [selectedId,setSelectedId]=useState<string|null>(null);const items=useData(s=>s.items);const open=useWindows(s=>s.open);const selected=items.find(i=>i.id===selectedId&&i.kind==='gallery'&&!i.deleted&&!i.private);
 function view(item:Item){if(item.kind==='gallery')setSelectedId(item.id);else open(item.kind as 'journal'|'bucket')}
 return <><div className="memory-timeline memory-card-grid" aria-label="Shared memory timeline">{memories.map(item=>{const isPhoto=item.kind==='gallery';const Icon=isPhoto?Camera:item.kind==='journal'?BookHeart:Star;const kind=isPhoto?'Photograph':item.kind==='journal'?'Journal page':'Adventure completed';return <article className="memory-card" key={item.id}><div className={`memory-card-preview ${isPhoto?'':'memory-written-preview'}`}>{isPhoto?<MemoryPhoto item={item} onClick={()=>view(item)}/>:<button aria-label={'Open '+item.title} onClick={()=>view(item)}><Icon size={36} strokeWidth={1.4}/><span>{kind}</span></button>}</div><div className="memory-card-copy"><div className="memory-card-kind"><Icon size={12}/>{kind}</div><h3><button onClick={()=>view(item)}>{item.title}</button></h3><Creator item={item}/><div className="memory-card-bottom"><time dateTime={item.date}><CalendarDays size={12}/>{format(parseISO(item.date),'MMM d, yyyy')}</time><button className="icon-button" aria-label={'Open memory '+item.title} onClick={()=>view(item)}><ArrowUpRight size={17}/></button></div></div></article>})}</div>{!memories.length&&<div className="memory-timeline-empty"><BookHeart size={34} strokeWidth={1}/><h3>No shared memories for {format(new Date(month+'-01T12:00:00'),'MMMM yyyy')} yet.</h3><p>Add a photo, share a journal page, or complete a goal to start this month’s story.</p><button className="button" onClick={()=>open('gallery')}>Add a memory <ArrowUpRight size={14}/></button></div>}{selected&&<Suspense fallback={<p className="memory-opening" role="status">Opening your memory…</p>}><PhotoDetails item={selected} onClose={()=>setSelectedId(null)}/></Suspense>}</>;
}
