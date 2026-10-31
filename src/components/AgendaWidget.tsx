import { createId } from '../lib/id';
import { lazy, Suspense, useState } from 'react';
import { addMonths, format, startOfMonth, startOfWeek, addDays, isSameMonth, isToday } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, ArrowUpRight, Plus, Check, Circle, Clock3 } from 'lucide-react';
import { useData, emptyDraft, type Item } from '../stores/data';
import { useWindows } from '../stores/windows';
import { useCalendar } from '../stores/calendar';
import { goalMonth, isMonthGoal } from '../lib/goalTiming';
import { agendaOnDate, calendarItems, upcomingAgenda, monthlyAgenda } from '../lib/agenda';
const RecordEditor = lazy(() => import('./RecordEditor').then(m => ({ default: m.RecordEditor })));

export function AgendaWidget({ compact = false, onOpenCalendar }: { compact?: boolean; onOpenCalendar?: () => void }) {
  const items = useData(s => s.items);
  const selected = useCalendar(s => s.date);
  const select = useCalendar(s => s.select);
  const open = useWindows(s => s.open);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<'day' | 'upcoming' | 'month'>('upcoming');
  const [editor, setEditor] = useState<Item | null>(null);
  const all = calendarItems(items);
  const agenda = view === 'day' ? agendaOnDate(items, selected) : view === 'month' ? monthlyAgenda(items, format(month,'yyyy-MM')) : upcomingAgenda(items).slice(0, compact ? 3 : 5);
  const start = startOfWeek(startOfMonth(month));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  function today() { const now = new Date(); select(format(now, 'yyyy-MM-dd')); setMonth(startOfMonth(now)); setView('day'); }
  return <section className={`agenda-widget ${compact ? 'agenda-compact' : ''}`} aria-label={compact ? 'Desktop agenda' : 'Calendar and agenda'}>
    <div className="agenda-heading"><div><span className="eyebrow">A LITTLE TIME FOR US</span><h2><CalendarDays size={18} />Calendar & agenda</h2></div><button className="icon-button" aria-label="Open full calendar" onClick={() => { select(view === 'day' ? selected : format(month,'yyyy-MM-dd')); open('calendar'); onOpenCalendar?.(); }}><ArrowUpRight size={18} /></button></div>
    <div className="agenda-columns"><div className="widget-calendar"><div className="widget-month"><button className="icon-button" aria-label="Previous widget month" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={16}/></button><b>{format(month, 'MMMM yyyy')}</b><button className="icon-button" aria-label="Next widget month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={16}/></button></div><div className="widget-weekdays">{'SMTWTFS'.split('').map((d, i) => <span key={i}>{d}</span>)}</div><div className="widget-days">{days.map(day => {
      const date = format(day, 'yyyy-MM-dd'); const count = all.filter(i => i.date === date).length;
      return <button key={date} aria-label={`${format(day, 'MMMM d, yyyy')}${count ? `, ${count} agenda items` : ''}`} aria-pressed={view === 'day' && selected === date} className={`${!isSameMonth(day, month) ? 'outside' : ''} ${isToday(day) ? 'is-today' : ''} ${selected === date && view === 'day' ? 'is-selected' : ''}`} onClick={() => { select(date); setView('day'); }}><span>{format(day, 'd')}</span>{count > 0 && <i />}</button>;
    })}</div><button className="text-button widget-today" onClick={today}>Back to today</button></div>
    <div className="widget-agenda"><div className="agenda-view-tabs"><button className={view === 'upcoming' ? 'selected' : ''} onClick={() => setView('upcoming')}>Coming up</button><button className={view === 'day' ? 'selected' : ''} onClick={() => setView('day')}>{format(new Date(selected + 'T12:00:00'), 'MMM d')}</button><button className={view === 'month' ? 'selected' : ''} onClick={() => setView('month')}>{format(month,'MMM')} goals</button></div><div className="agenda-events">{agenda.map(item => <button className={`agenda-event ${item.done ? 'agenda-done' : ''}`} key={item.id} onClick={() => setEditor(item)}><span className={`agenda-date-chip ${item.kind === 'bucket' ? 'sage' : ''}`}><b>{isMonthGoal(item) ? format(new Date(goalMonth(item)+'-01T12:00:00'),'MMM') : format(new Date(item.date + 'T12:00:00'), 'd')}</b><small>{isMonthGoal(item) ? 'ANY DAY' : format(new Date(item.date + 'T12:00:00'), 'MMM')}</small></span><span className="agenda-event-copy"><b>{item.title}</b><small>{item.done ? <Check size={11}/> : <Clock3 size={11}/>} {isMonthGoal(item) ? 'Any day in '+format(new Date(goalMonth(item)+'-01T12:00:00'),'MMMM') : item.category || (item.kind === 'bucket' ? 'Bucket-list goal' : 'Our plans')}</small></span><ChevronRight size={13}/></button>)}</div>{!agenda.length && <div className="agenda-empty"><Circle size={24} strokeWidth={1}/><b>{view === 'month' ? 'No flexible goals this month.' : view === 'day' ? 'A little breathing room.' : 'Our next chapter is unwritten.'}</b><p>{view === 'day' ? 'No plans on this day. Make it a good one.' : 'Add a date or a little adventure to look forward to.'}</p></div>}<button className="button agenda-add" onClick={() => setEditor({ ...emptyDraft('calendar'), id: createId(), date: view === 'day' ? selected : format(new Date(), 'yyyy-MM-dd') })}><Plus size={14}/>Add a plan{view === 'day' ? ` · ${format(new Date(selected + 'T12:00:00'), 'MMM d')}` : ''}</button></div></div>
    {editor && <Suspense fallback={null}><RecordEditor kind={editor.kind} item={editor} onClose={() => setEditor(null)}/></Suspense>}
  </section>;
}
