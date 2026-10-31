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
 const initial=item||emptyDraft(kind);const [onCalendar,setOnCalendar]=useState(Boolean(initial.data.showOnCalendar));const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm({resolver:zodResolver(schema),defaultValues:{title:initial.title,body:initial.body,date:initial.date,category:initial.category,amount:initial.amount,private:initial.private}});
 return <Modal label={item?'Edit moment':'New moment'} onClose={onClose} busy={isSubmitting}><form className="editor paper" onSubmit={handleSubmit(async values=>{try{await save({...initial,...values,data:{...initial.data,...(kind==='bucket'?{showOnCalendar:onCalendar}:{})}} as Draft);onClose()}catch(e){setError((e as Error).message)}})}><div className="section-heading"><div><span className="eyebrow">A LITTLE SOMETHING</span><h2>{item?'Edit your moment':'Make a new memory'}</h2></div><button type="button" className="icon-button" aria-label="Close editor" onClick={onClose}><X size={19}/></button></div>
 <label>Title<input autoFocus {...register('title')} placeholder="A picnic, a little thought, an adventure…"/></label>{errors.title&&<small className="error">{errors.title.message}</small>}
 <div className="form-row"><label>Date<input type="date" {...register('date')}/></label><label>Category<input {...register('category')} placeholder={kind==='finances'?'Food, Transport, Savings…':'Our little moments'}/></label></div>
 {['finances','wishlist','dates','bucket','outfits'].includes(kind)&&<label>{kind==='finances'?'Amount (₱)':'Estimated budget (₱)'}<input type="number" min="0" step="0.01" {...register('amount',{valueAsNumber:true})}/></label>}
 {errors.amount&&<small className="error">{errors.amount.message}</small>}
 <label>{kind==='dates'?'Itinerary · one stop per line':'Notes'}<textarea rows={5} {...register('body')} placeholder={kind==='dates'?'Go Bento · lunch\nA walk together · afternoon\nPhotobooth · before we go home':'The little details worth keeping…'}/></label>
 {kind==='bucket'&&<label className="check-label"><input type="checkbox" checked={onCalendar} onChange={e=>setOnCalendar(e.target.checked)}/>Show this goal in the calendar and agenda</label>}
 {['notes','journal','anniversary'].includes(kind)&&<label className="check-label"><input type="checkbox" {...register('private')}/>Private · {mode==='cloud'?'visible only to you':'local preview is not a secure private account'}</label>}
 {error&&<p className="error" role="alert">{error}</p>}<div className="editor-footer"><button type="button" className="button subtle" onClick={onClose}>Cancel</button><button className="button primary" disabled={isSubmitting}>{isSubmitting?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}Save {kind==='notes'?'note':'moment'}</button></div></form></Modal>
}
