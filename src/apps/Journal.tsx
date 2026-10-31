import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Plus, Bold, Italic, List, Trash2, LockKeyhole, BookHeart, ChevronLeft, ChevronRight, Search, Bookmark, StickyNote } from 'lucide-react';
import { useData, emptyDraft, type Item } from '../stores/data';
import { usePreferences } from '../stores/preferences';

const monthNames = Array.from({ length: 12 }, (_, month) => format(new Date(2026, month, 1), 'MMM'));
export function Journal() {
  const { items, save, remove, mode } = useData();
  const [id, setId] = useState<string | null>(null);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState(1);
  const entries = items.filter(i => i.kind === 'journal' && !i.deleted).sort((a,b) => a.date.localeCompare(b.date) || String(a.data.createdAt || '').localeCompare(String(b.data.createdAt || '')) || a.id.localeCompare(b.id));
  const pages = entries.filter(i => i.date.startsWith(month) && (i.title + i.body).toLowerCase().includes(search.toLowerCase()));
  const active = entries.find(i => i.id === id);
  const activeRef = useRef(active); activeRef.current = active;
  const pending = useRef<{ id: string; body: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const motionEnabled = usePreferences(s => s.motion);
  const reduced = useReducedMotion() || !motionEnabled;
  const index = pages.findIndex(i => i.id === id);

  function patchEntry(entryId: string, patch: Partial<Item>) {
    const task = queue.current.catch(() => {}).then(async () => {
      const current = useData.getState().items.find(i => i.id === entryId);
      if (!current || current.deleted) return;
      await save({ ...current, ...patch, data: { ...current.data, ...patch.data } });
    });
    queue.current = task;
    return task;
  }
  async function flushBody() {
    clearTimeout(timer.current);
    const draft = pending.current;
    if (!draft) { await queue.current; return; }
    pending.current = null;
    try { await patchEntry(draft.id, { body: draft.body }); setStatus('Saved with love'); }
    catch (e) { pending.current ??= draft; setStatus('Not saved. Your writing is still here — try again.'); throw e; }
  }
  const flushRef = useRef(flushBody); flushRef.current = flushBody;
  const editor = useEditor({
    extensions: [StarterKit], content: '',
    onCreate: ({ editor }) => editor.commands.setContent(activeRef.current?.body || '', { emitUpdate: false }),
    editorProps: { attributes: { class: 'journal-writing', 'aria-label': 'Journal entry' } },
    onUpdate: ({ editor }) => {
      if (!activeRef.current) return;
      pending.current = { id: activeRef.current.id, body: editor.getHTML() };
      setStatus('Saving your little moment…'); clearTimeout(timer.current);
      timer.current = setTimeout(() => { void flushRef.current().catch(() => {}); }, 700);
    },
  });
  useEffect(() => {
    if (editor?.isInitialized && !editor.isDestroyed) editor.commands.setContent(active?.body || '', { emitUpdate: false });
  }, [id, editor]);
  useEffect(() => () => { void flushRef.current().catch(() => {}); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (pending.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  async function choosePage(nextId: string | null, nextMonth?: string) {
    try {
      await flushBody(); setDirection(pages.findIndex(i => i.id === nextId) < index ? -1 : 1);
      setId(nextId); if (nextMonth) setMonth(nextMonth); setStatus('');
    } catch { /* Keep the open page and unsaved text in place. */ }
  }
  async function chooseMonth(value: string) {
    const first = entries.find(i => i.date.startsWith(value));
    await choosePage(first?.id || null, value);
  }
  async function newEntry() {
    try {
      await flushBody();
      const date = format(new Date(), 'yyyy-MM') === month ? format(new Date(), 'yyyy-MM-dd') : month + '-01';
      const item = { ...emptyDraft('journal'), date, id: crypto.randomUUID(), title: 'A little moment', category: 'Little moments', data: { createdAt: new Date().toISOString() } };
      await save(item); setId(item.id); setDirection(1); setStatus('');
    } catch { setStatus('Could not open a new page. Please save your current writing and try again.'); }
  }
  async function metadata(patch: Partial<Item>) {
    if (!active) return;
    try { await flushBody(); await patchEntry(active.id, patch); setStatus('Saved with love'); return true; }
    catch { setStatus('Could not save this change. Please try again.'); return false; }
  }
  return <div className="journal-app notebook-app">
    <aside className="journal-sidebar notebook-index">
      <div className="notebook-index-heading"><img src="/assets/notebook/pressed-flower.svg" alt=""/><span className="eyebrow">OUR STORY SO FAR</span><h2>The Journal</h2><p>Ordinary days.<br/>Extraordinary little us.</p></div>
      <button className="button primary" onClick={newEntry}><Plus size={15}/>New page</button>
      <label className="notebook-search"><Search size={14}/><input aria-label="Search journal" placeholder="Find a memory…" value={search} onChange={e => setSearch(e.target.value)}/></label>
      <div className="notebook-index-label"><Bookmark size={12}/>{format(parseISO(month + '-01'), 'MMMM yyyy')}<span>{pages.length}</span></div>
      <div className="notebook-page-list">{pages.map((entry, i) => <button className={`journal-entry-link ${id === entry.id ? 'active' : ''}`} key={entry.id} onClick={() => void choosePage(entry.id)}><small>PAGE {String(i+1).padStart(2,'0')} · {format(parseISO(entry.date), 'MMM d')}{entry.private && <LockKeyhole size={11}/>}</small><b>{entry.title}</b><span>{entry.body.replace(/<[^>]*>/g,'').slice(0,50) || 'An unwritten little moment'}</span></button>)}{!pages.length && <p className="index-empty">{search ? 'No matching pages this month.' : 'A fresh chapter is waiting.'}</p>}</div>
      <div className="index-sticker"><img src="/assets/notebook/together-stamp.svg" alt=""/><span>the little things<br/>are the big things.</span></div>
    </aside>
    <div className="notebook-workspace">
      <div className="notebook-year"><button className="icon-button" aria-label="Previous journal year" onClick={() => void chooseMonth(`${Number(month.slice(0,4))-1}${month.slice(4)}`)}><ChevronLeft size={16}/></button><span>{month.slice(0,4)} <i>· a year of us</i></span><button className="icon-button" aria-label="Next journal year" onClick={() => void chooseMonth(`${Number(month.slice(0,4))+1}${month.slice(4)}`)}><ChevronRight size={16}/></button><button className="text-button journal-today" onClick={() => void chooseMonth(format(new Date(),'yyyy-MM'))}>This month</button></div>
      <div className="notebook-with-tabs"><div className="notebook-binding" aria-hidden="true">{Array.from({length:11},(_,i) => <i key={i}/>)}</div>
        <div className="journal-notebook ruled-page">
          <AnimatePresence initial={false} mode="sync"><motion.div key={id || month} className="page-flip-overlay" aria-hidden="true" initial={reduced ? {opacity:0} : {rotateY:direction > 0 ? -75 : 75,opacity:.75}} animate={{rotateY:0,opacity:0}} exit={{opacity:0}} transition={{duration:reduced?0:.5,ease:'easeOut'}}/></AnimatePresence>
          <div className="journal-editor-slot" hidden={!active}><EditorContent editor={editor}/></div>
          {active ? <>
            <div className="journal-page-top"><label className="journal-date-label"><input aria-label="Journal date" type="date" value={active.date} onChange={e => { const value=e.target.value;if(value)void metadata({date:value}).then(saved => { if(saved)setMonth(value.slice(0,7)); }); }}/></label><span className="journal-save-status" aria-live="polite">{status || 'Your story, safely tucked away'}</span></div>
            <input className="journal-title" aria-label="Journal title" key={active.id} defaultValue={active.title} onBlur={e => void metadata({title:e.target.value.trim() || 'Untitled page'})}/>
            <div className="journal-tools"><button aria-label="Bold" aria-pressed={editor?.isActive('bold') || false} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={15}/></button><button aria-label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={15}/></button><button aria-label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={15}/></button><span className="journal-tools-divider"/><label className="check-label"><input type="checkbox" checked={active.private} onChange={e => void metadata({private:e.target.checked})}/><LockKeyhole size={11}/>Private{mode==='local'?' (preview)':''}</label><button aria-label="Delete journal entry" onClick={async () => { try { await flushBody(); await remove(active.id); setId(null); } catch { setStatus('Could not delete entry.'); } }}><Trash2 size={15}/></button></div>
            <div className="journal-scrapbook-footer"><div className="journal-sticky"><span className="paper-tape"/><label><StickyNote size={14}/>A little highlight<textarea aria-label="Journal sticky note" key={active.id} defaultValue={active.data.stickyNote || ''} maxLength={600} placeholder="One thing I never want to forget…" onBlur={e => void metadata({data:{stickyNote:e.target.value}})}/></label></div><img className="page-flower" src="/assets/notebook/pressed-flower.svg" alt=""/><p>“The best part of today<br/>was sharing it with you.”</p></div>
          </> : <div className="empty-state notebook-empty"><img src="/assets/notebook/love-letter.svg" alt=""/><span className="eyebrow">{format(parseISO(month+'-01'),'MMMM yyyy').toUpperCase()} · OUR NEXT CHAPTER</span><h1>Every us-day has a story.</h1><p>{search ? 'Try another search, or start a new page.' : 'Pick a month at the edge, turn a page,\nor write a little memory worth keeping.'}</p><button className="button primary" onClick={newEntry}><Plus size={16}/>Write our next page</button></div>}
          {status.startsWith('Could not') && !active && <p className="error" role="alert">{status}</p>}
          <div className="notebook-page-navigation"><button aria-label="Previous journal page" disabled={index<=0} onClick={() => void choosePage(pages[index-1].id)}><ChevronLeft size={17}/>Previous</button><span>{active && index >= 0 ? `Page ${index+1} of ${pages.length}` : `${pages.length} ${pages.length===1?'page':'pages'}`}<BookHeart size={13}/></span><button aria-label="Next journal page" disabled={index<0 || index>=pages.length-1} onClick={() => void choosePage(pages[index+1].id)}>Next<ChevronRight size={17}/></button></div>
        </div>
        <nav className="notebook-month-tabs" aria-label="Journal months">{monthNames.map((name,i) => {const value=`${month.slice(0,4)}-${String(i+1).padStart(2,'0')}`;const count=entries.filter(entry=>entry.date.startsWith(value)).length;return <button key={name} className={`${month===value?'selected':''} tab-${i%4}`} aria-label={`${name} ${month.slice(0,4)}${count?`, ${count} pages`:''}`} aria-pressed={month===value} onClick={() => void chooseMonth(value)}>{name}{count>0&&<i/>}</button>;})}</nav>
      </div>
    </div>
  </div>;
}
