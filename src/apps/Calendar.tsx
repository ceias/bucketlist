import { createId } from '../lib/id';
import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, Heart } from 'lucide-react';
import { useData, emptyDraft, type Item } from '../stores/data';
import { useCalendar } from '../stores/calendar';
import { monthlyAgenda } from '../lib/agenda';
import { format } from 'date-fns';
import { calendarItems } from '../lib/agenda';
import { RecordEditor } from '../components/RecordEditor';
export function CalendarApp(){const {items,save}=useData();const [editor,setEditor]=useState<Item|'new'|null>(null);const [error,setError]=useState('');
 const selectedDate=useCalendar(s=>s.date);const [visibleMonth,setVisibleMonth]=useState(selectedDate.slice(0,7));const monthGoals=monthlyAgenda(items,visibleMonth);const calendarRef=useRef<FullCalendar>(null);useEffect(()=>{calendarRef.current?.getApi().gotoDate(selectedDate)},[selectedDate]);
 const year=new Date().getFullYear();const anniversary=Array.from({length:12},(_,i)=>year-1+i).filter(y=>y>=2027).map(y=>({id:'anniversary-'+y,title:`${y-2026}${y===2027?'st':y===2028?'nd':y===2029?'rd':'th'} anniversary ♡`,start:`${y}-02-13`,allDay:true,color:'#c66f80',editable:false}));
 return <div className="app-page calendar-page"><div className="section-heading"><div><span className="eyebrow">DAYS WITH YOU</span><h1>Our Calendar</h1><p>A little room for everything we look forward to.</p></div><button className="button primary" onClick={()=>setEditor('new')}><Plus size={16}/>Add event</button></div><div className="calendar-legend"><span><i/>Our plans</span><span><Heart size={12}/>February 13 · our day</span><span>Click a day to make a plan</span></div>{error&&<p role="alert" className="error">{error}</p>}{monthGoals.length>0&&<details className="calendar-month-goals" open><summary>{format(new Date(visibleMonth+'-01T12:00:00'),'MMMM')} goals <span>Any day this month · {monthGoals.length}</span></summary><div>{monthGoals.map(goal=><button key={goal.id} onClick={()=>setEditor(goal)}>{goal.title}</button>)}</div></details>}<FullCalendar datesSet={info=>setVisibleMonth(format(info.view.currentStart,'yyyy-MM'))} ref={calendarRef} initialDate={selectedDate} plugins={[dayGridPlugin,timeGridPlugin,listPlugin,interactionPlugin]} initialView="dayGridMonth" headerToolbar={{left:'prev,next today',center:'title',right:'dayGridMonth,timeGridWeek,timeGridDay,listMonth'}} buttonText={{today:'Today',month:'Month',week:'Week',day:'Day',list:'Agenda'}} height="auto" editable selectable dayMaxEvents={2} events={[...calendarItems(items).map(i=>({id:i.id,title:i.title,start:i.date,allDay:true,color:i.kind==='bucket'?'#91a174':i.kind==='dates'?'#7a895a':'#c66f80'})),...anniversary]} dateClick={e=>setEditor({...emptyDraft('calendar'),id:createId(),date:e.dateStr})} eventClick={e=>{const i=items.find(i=>i.id===e.event.id);if(i)setEditor(i)}} eventDrop={async e=>{const i=items.find(i=>i.id===e.event.id);if(i)try{await save({...i,date:e.event.startStr.slice(0,10)})}catch(err){e.revert();setError((err as Error).message)}}}/>{editor&&<RecordEditor kind={editor==='new'?'calendar':editor.kind} item={editor==='new'?undefined:editor} onClose={()=>setEditor(null)}/>}</div>}
