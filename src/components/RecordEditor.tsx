import { Creator,PrivacyBadge,PlanTogether } from '../together/components';
import { isMonthGoal } from '../lib/goalTiming';
import { Modal } from './Modal';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Check, LoaderCircle } from 'lucide-react';
import { emptyDraft, useData, type Item, type Draft } from '../stores/data';
const schema=z.object({title:z.string().trim().min(1,'Give this little moment a name.').max(200),body:z.string(),date:z.string(),category:z.string(),amount:z.number().min(0,'Amount must be positive.'),private:z.boolean()});
export function RecordEditor({kind,item,onClose}:{kind:string;item?:Item;onClose:()=>void}){
 const save=useData(s=>s.save);const mode=useData(s=>s.mode);const [error,setError]=useState('');
 const initial=item||emptyDraft(kind);const [precision,setPrecision]=useState<'month'|'day'>(kind==='bucket'&&(!item||isMonthGoal(item))?'month':'day');const [onCalendar,setOnCalendar]=useState(Boolean(initial.data.showOnCalendar));const {register,handleSubmit,formState:{errors,isSubmitting},setValue,getValues,watch}=useForm({resolver:zodResolver(schema),defaultValues:{title:initial.title,body:initial.body,date:kind==='bucket'&&precision==='month'?initial.date.slice(0,7):initial.date,category:initial.category,amount:initial.amount,private:initial.private}});
 return <Modal label={item?'Edit moment':'New moment'} onClose={onClose} busy={isSubmitting}><form className="editor paper" onSubmit={handleSubmit(async values=>{try{await save({...initial,...values,date:kind==='bucket'&&precision==='month'?values.date+'-01':values.date,data:{...initial.data,...(kind==='bucket'?{showOnCalendar:onCalendar,datePrecision:precision,targetMonth:values.date.slice(0,7)}:{})}} as Draft);onClose()}catch(e){setError((e as Error).message)}})}><div className="section-heading"><div><span className="eyebrow">A LITTLE SOMETHING</span><h2>{item?'Edit your moment':'Make a new memory'}</h2></div><button type="button" className="icon-button" aria-label="Close editor" onClick={onClose}><X size={19}/></button></div>
 <label>Title<input autoFocus {...register('title')} placeholder="A picnic, a little thought, an adventure…"/></label>{errors.title&&<small className="error">{errors.title.message}</small>}
 {kind==='bucket'&&<div className="goal-timing"><span>When is this goal for?</span><div className="tabs"><button type="button" className={precision==='month'?'selected':''} onClick={()=>{setPrecision('month');setValue('date',getValues('date').slice(0,7))}}>Month only</button><button type="button" className={precision==='day'?'selected':''} onClick={()=>{setPrecision('day');const value=getValues('date');setValue('date',value.length===7?value+'-01':value)}}>Specific day</button></div></div>}
 <div className="form-row"><label>{kind==='bucket'&&precision==='month'?'Goal month':'Date'}<input required={kind==='bucket'} type={kind==='bucket'&&precision==='month'?'month':'date'} {...register('date')}/></label><label>Category<input {...register('category')} placeholder={kind==='finances'?'Food, Transport, Savings…':'Our little moments'}/></label></div>
 {['finances','wishlist','dates','bucket','outfits'].includes(kind)&&<label>{kind==='finances'?'Amount (₱)':'Estimated budget (₱)'}<input type="number" min="0" step="0.01" {...register('amount',{valueAsNumber:true})}/></label>}
 {errors.amount&&<small className="error">{errors.amount.message}</small>}
 <label>{kind==='dates'?'Itinerary · one stop per line':'Notes'}<textarea rows={5} {...register('body')} placeholder={kind==='dates'?'Go Bento · lunch\nA walk together · afternoon\nPhotobooth · before we go home':'The little details worth keeping…'}/></label>
 {kind==='bucket'&&<label className="check-label"><input type="checkbox" checked={onCalendar} onChange={e=>setOnCalendar(e.target.checked)}/>{precision==='month'?'Show in monthly agenda (no day assigned)':'Show this goal in the calendar and agenda'}</label>}
 {['notes','journal','anniversary'].includes(kind)&&<label className="check-label"><input type="checkbox" {...register('private')}/>Private · {mode==='cloud'?'visible only to you':'local preview is not a secure private account'}</label>}
 <PrivacyBadge private={!!watch('private')}/>{item&&<Creator item={item}/>}
 {item&&['bucket','calendar','dates'].includes(kind)&&<PlanTogether item={item}/>}
 {error&&<p className="error" role="alert">{error}</p>}<div className="editor-footer"><button type="button" className="button subtle" onClick={onClose}>Cancel</button><button className="button primary" disabled={isSubmitting}>{isSubmitting?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}Save {kind==='notes'?'note':'moment'}</button></div></form></Modal>
}
