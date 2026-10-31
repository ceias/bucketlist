import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { withRequestDeadline } from '../lib/requestDeadline';
import { createId } from '../lib/id';
import { useData } from '../stores/data';
import { useSync } from '../stores/sync';
import type { Entry,Action,Activity,Inbox,Member,Reminder } from './model';
const empty={entries:[] as Entry[],actions:[] as Action[],activity:[] as Activity[],inbox:[] as Inbox[],members:[] as Member[],reminders:[] as Reminder[],remindersEnabled:false,reminderReady:false};
function context(){const s=useData.getState();return {cloud:s.mode==='cloud',workspace:s.workspace||'local',user:s.user||'local'}}
function localRead(){try{return JSON.parse(localStorage.getItem('gio-together-local')||'{}')}catch{return {}}}
function persistLocal(){const {entries,actions,activity,inbox,reminders,remindersEnabled}=useTogether.getState();localStorage.setItem('gio-together-local',JSON.stringify({entries,actions,activity,inbox,reminders,remindersEnabled}));}
async function rpc(name:string,args:Record<string,unknown>={}){const {data,error}=await withRequestDeadline(()=>supabase!.rpc(name,args));if(error)throw new Error(error.message);return data}
let epoch=0;
type State=typeof empty&{loading:boolean;error:string;ready:boolean;reset:()=>void;load:()=>Promise<void>;saveEntry:(entry:Partial<Entry>&Pick<Entry,'kind'|'title'>)=>Promise<void>;removeEntry:(id:string)=>Promise<void>;act:(kind:Action['kind'],target:{record_id?:string;entry_id?:string},key:string,value:Record<string,unknown>,shared?:boolean)=>Promise<void>;markRead:()=>Promise<void>;setReminders:(enabled:boolean)=>Promise<void>;remind:(record_id:string,due_at:string,email:boolean)=>Promise<void>;cancelReminder:(id:string)=>Promise<void>};
export const useTogether=create<State>((set,get)=>({...empty,loading:false,error:'',ready:false,
reset:()=>{epoch++;set({...empty,ready:false,error:'',loading:false})},
load:async()=>{const revision=epoch;const ctx=context();if(!ctx.cloud){set({...empty,...localRead(),members:[{user_id:'local',display_name:'You',joined_at:new Date().toISOString()}],ready:true,loading:false,error:''});return}set({loading:true});try{const result=await rpc('get_couple_space',{target_workspace:ctx.workspace});if(revision!==epoch)return;set({...empty,...result,loading:false,ready:true,error:''})}catch(e){if(revision===epoch)set({loading:false,ready:false,error:(e as Error).message})}},
saveEntry:async input=>useSync.getState().run(async()=>{const ctx=context();const old=get().entries.find(e=>e.id===input.id);const now=new Date().toISOString();const entry:Entry={id:input.id||createId(),workspace_id:ctx.workspace,owner_id:ctx.user,body:'',date:null,unlock_at:null,data:{},created_at:now,updated_at:now,...old,...input};if(ctx.cloud){await rpc('save_couple_entry',{entry:entry});await get().load()}else{set(s=>({entries:[entry,...s.entries.filter(e=>e.id!==entry.id)],activity:[{id:createId(),workspace_id:ctx.workspace,actor_id:ctx.user,actor_name:'You',label:old?'Updated '+entry.kind:'Added '+entry.kind,kind:entry.kind,entry_id:entry.id,record_id:null,created_at:now},...s.activity]}));persistLocal()}}),
removeEntry:async id=>useSync.getState().run(async()=>{if(context().cloud){await rpc('delete_couple_entry',{entry_id:id});await get().load()}else{set(s=>({entries:s.entries.filter(e=>e.id!==id),actions:s.actions.filter(a=>a.entry_id!==id)}));persistLocal()}}),
act:async(kind,target,key,value,shared=true)=>useSync.getState().run(async()=>{const ctx=context();if(ctx.cloud){await rpc('save_couple_action',{action_kind:kind,record_id:target.record_id||null,entry_id:target.entry_id||null,action_key:key,action_value:value,is_shared:shared});await get().load()}else{const old=get().actions.find(a=>a.kind===kind&&a.owner_id===ctx.user&&a.record_id===(target.record_id||null)&&a.entry_id===(target.entry_id||null)&&a.key===key);const now=new Date().toISOString();const row:Action={id:old?.id||createId(),workspace_id:ctx.workspace,owner_id:ctx.user,record_id:target.record_id||null,entry_id:target.entry_id||null,kind,key,value,shared,created_at:old?.created_at||now,updated_at:now};set(s=>({actions:[row,...s.actions.filter(a=>a.id!==row.id)]}));persistLocal()}}),
markRead:async()=>{if(context().cloud){await rpc('read_couple_inbox');await get().load()}else{set(s=>({inbox:s.inbox.map(n=>({...n,read_at:new Date().toISOString()}))}));persistLocal()}},
setReminders:async enabled=>{if(context().cloud)await rpc('set_couple_reminders',{enabled});set({remindersEnabled:enabled});if(!context().cloud)persistLocal()},
remind:async(record_id,due_at,email)=>useSync.getState().run(async()=>{if(!context().cloud)throw Error('Scheduled reminders require a connected workspace.');await rpc('schedule_couple_reminder',{record_id,due_at,email});await get().load()}),
cancelReminder:async id=>{await rpc('cancel_couple_reminder',{reminder_id:id});await get().load()}
}));
