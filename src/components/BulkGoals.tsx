import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ClipboardPaste, X, ArrowRight, Check, CalendarDays, LoaderCircle, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { parseBulkGoals } from '../lib/bulkGoals';
import { emptyDraft, useData, type Item } from '../stores/data';
const example = `November 2026 — Matching Era\n- Buy matching shirts\n- Choose our coordinated colors\n\nDecember 2026 — BGC Food Crawl\n- Wear our matching outfits\n2026-12-12 | Go Bento lunch | Food | Try something new together\n2026-12-12 | A little photobooth stop | Memories`;
export function BulkGoals({ month, onClose }: { month: string; onClose: () => void }) {
  const [text, setText] = useState('');
  const [defaultMonth, setDefaultMonth] = useState(month);
  const [onCalendar, setOnCalendar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);
  const mode = useData(s => s.mode);
  useEffect(() => { if (!busy) { setSlow(false); return; } const timer = setTimeout(() => setSlow(true), 5000); return () => clearTimeout(timer); }, [busy]);
  const items = useData(s => s.items);
  const saveMany = useData(s => s.saveMany);
  const pending = useRef<Item[] | null>(null);
  const lock = useRef(false);
  const parsed = useMemo(() => parseBulkGoals(text, defaultMonth, items.filter(i => i.kind === 'bucket' && !i.deleted)), [text, defaultMonth, items]);
  const ready = parsed.rows.filter(row => !row.duplicate);
  const duplicateCount = parsed.rows.length - ready.length;
  const groups = [...new Set(ready.map(row => row.date.slice(0,7)))].sort();
  function changed() { pending.current = null; setError(''); }
  async function importGoals() {
    if (lock.current || !ready.length || parsed.issues.length) return;
    lock.current = true; setBusy(true); setError('');
    pending.current ??= ready.map(row => ({ ...emptyDraft('bucket'), id: crypto.randomUUID(), title: row.title, date: row.date, category: row.category, body: row.body, data: { showOnCalendar: onCalendar } }));
    try { await saveMany(pending.current); onClose(); }
    catch (e) { setError((e as Error).message + ' Your paste is still here. You can try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal className="modal-backdrop bulk-backdrop" label="Paste your agendas" onClose={onClose} busy={busy}><section className="bulk-dialog">
    <div className="bulk-title"><span className="import-icon"><ClipboardPaste size={24}/></span><div><span className="eyebrow">LESS TYPING. MORE ADVENTURES.</span><h2>One paste. A world of plans.</h2><p>Drop in your list. We’ll sort it into months.</p></div><button className="icon-button" disabled={busy} aria-label="Close bulk import" onClick={onClose}><X size={20}/></button></div>
    <div className="bulk-columns"><div className="bulk-input"><div className="bulk-section-label"><b>1. Paste your agendas</b><button className="text-button" disabled={busy} onClick={() => { changed(); setText(example); }}>Try an example</button></div><textarea autoFocus aria-label="Agendas to import" disabled={busy} value={text} onChange={e => { changed(); setText(e.target.value); }} placeholder={example} rows={13}/><div className="bulk-options"><label>Default month<input type="month" value={defaultMonth} disabled={busy} onChange={e => { changed(); setDefaultMonth(e.target.value); }}/></label><label className="check-label"><input type="checkbox" checked={onCalendar} disabled={busy} onChange={e => { changed(); setOnCalendar(e.target.checked); }}/>Show imported goals on the calendar</label></div><p className="import-help">One goal per line. Add month headings to group them. For an exact date, use <code>2027-02-13 | Anniversary dinner | Food</code>. Undated goals use the first day of their month. Review dates before importing.</p></div>
    <div className="bulk-review"><div className="bulk-section-label"><b>2. Review your little plans</b><span>{ready.length} new</span></div>{!text.trim() ? <div className="bulk-empty"><CalendarDays size={34} strokeWidth={1}/><h3>Your plans will take shape here.</h3><p>We’ll show the months, dates, and titles before you add anything.</p></div> : <>{parsed.issues.map((issue, i) => <p className="import-issue" role="alert" key={i}><AlertCircle size={14}/>{issue.line ? `Line ${issue.line}: ` : ''}{issue.message}</p>)}{duplicateCount > 0 && <p className="duplicate-notice"><Check size={14}/>{duplicateCount} duplicate {duplicateCount === 1 ? 'goal' : 'goals'} will be skipped.</p>}{groups.map(group => <section key={group} className="import-month"><h3><CalendarDays size={14}/>{format(parseISO(group + '-01'), 'MMMM yyyy')}<span>{ready.filter(row => row.date.startsWith(group)).length}</span></h3>{ready.filter(row => row.date.startsWith(group)).map(row => <div className="import-row" key={row.line}><span>{format(parseISO(row.date), 'dd')}</span><div><b>{row.title}</b><small>{row.category}</small></div></div>)}</section>)}</>}</div></div>
    <footer className="bulk-footer">{busy&&<p className="import-saving-status" role="status"><LoaderCircle size={14} className="spin"/>{slow?'Still waiting for Supabase. We’ll stop after 15 seconds if it does not respond.':mode==='cloud'?'Saving your goals to your shared workspace…':'Saving your goals…'}</p>}<span>{ready.length} goals · {groups.length} months{onCalendar ? ' · visible in your agenda' : ''}</span>{error && <p className="error" role="alert">{error}</p>}<button className="button subtle" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || !ready.length || !!parsed.issues.length} onClick={importGoals}>{busy ? <LoaderCircle size={16} className="spin"/> : <ArrowRight size={16}/>}{busy?'Saving…':`Import ${ready.length || ''} ${ready.length === 1 ? 'goal' : 'goals'}`}</button></footer>
  </section></Modal>;
}
