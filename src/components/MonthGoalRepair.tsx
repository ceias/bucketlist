import { useState } from 'react';
import { CalendarDays, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Modal } from './Modal';
import { makeMonthOnly } from '../lib/goalTiming';
import { useData, type Item } from '../stores/data';

export function MonthGoalRepair({ month, candidates, onClose }: { month: string; candidates: Item[]; onClose: () => void }) {
  const [selected,setSelected]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const saveMany=useData(s=>s.saveMany);
  const monthName=format(parseISO(month+'-01'),'MMMM yyyy');
  return <Modal label="Correct month-only goals" onClose={onClose} busy={busy}><section className="editor month-repair"><div className="section-heading"><div><span className="eyebrow">LET THE WHOLE MONTH BE YOURS</span><h2>Goals for {monthName}</h2></div><button className="icon-button" aria-label="Close date correction" disabled={busy} onClick={onClose}><X size={18}/></button></div><p>Earlier imports assigned the first day to month-only goals. Select the goals that belong to the whole month. Leave deliberately scheduled goals unchecked.</p><button className="text-button" disabled={busy} onClick={()=>setSelected(selected.length===candidates.length?[]:candidates.map(i=>i.id))}>{selected.length===candidates.length?'Clear selection':'Select all'}</button><div className="month-repair-list">{candidates.map(item=><label className="check-label" key={item.id}><input type="checkbox" disabled={busy} checked={selected.includes(item.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,item.id]:ids.filter(id=>id!==item.id))}/><span>{item.title}</span></label>)}</div><div className="month-repair-note"><CalendarDays size={16}/>Selected goals will say “{monthName} · any day” and won’t be pinned to a calendar day.</div>{error&&<p className="error" role="alert">{error}</p>}<div className="editor-footer"><button className="button subtle" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy||!selected.length} onClick={async()=>{setBusy(true);setError('');try{await saveMany(candidates.filter(i=>selected.includes(i.id)).map(makeMonthOnly));onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><Check size={15}/>{busy?'Saving…':`Make ${selected.length} month-only`}</button></div></section></Modal>;
}
