import { createId } from '../lib/id';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { withRequestDeadline } from '../lib/requestDeadline';
import { missionSeeds } from '../data/missions';
export type Item={id:string;kind:string;title:string;body:string;date:string;category:string;amount:number;done:boolean;private:boolean;data:Record<string,any>;deleted?:boolean;owner_id?:string;workspace_id?:string};
export type Draft=Omit<Item,'id'>;
type State={items:Item[];workspace:string|null;user:string|null;loading:boolean;error:string|null;mode:'local'|'cloud';save:(item:Draft|Item)=>Promise<void>;saveMany:(items:Item[])=>Promise<void>;remove:(id:string)=>Promise<void>;restore:(id:string)=>Promise<void>;purge:(id:string)=>Promise<void>;connect:(workspace:string,user:string)=>Promise<void>;disconnect:()=>void;clearError:()=>void};
let localItems:Item[]=[];
export const useData=create<State>()(persist((set,get)=>({items:[],workspace:null,user:null,loading:false,error:null,mode:'local',clearError:()=>set({error:null}),
 save:async(item)=>{try{const s=get();const row={...item,id:'id' in item?item.id:createId()};if(s.mode==='cloud'&&supabase){const {error}=await supabase.from('records').upsert({...row,workspace_id:s.workspace,owner_id:row.owner_id||s.user});if(error)throw error;}set(current=>({items:[...current.items.filter(i=>i.id!==row.id),row]}));}catch(e){set({error:(e as Error).message});throw e;}},
 saveMany:async(rows)=>{if(!rows.length)return;try{const s=get();if(s.mode==='cloud'&&supabase){const {error}=await withRequestDeadline(signal=>supabase!.from('records').upsert(rows.map(row=>({...row,workspace_id:s.workspace,owner_id:row.owner_id||s.user}))).abortSignal(signal));if(error)throw error;}const ids=new Set(rows.map(row=>row.id));set(current=>({items:[...current.items.filter(i=>!ids.has(i.id)),...rows]}));}catch(e){set({error:(e as Error).message});throw e;}},
 remove:async(id)=>{const item=get().items.find(i=>i.id===id);if(item)await get().save({...item,deleted:true})},
 restore:async(id)=>{const item=get().items.find(i=>i.id===id);if(item)await get().save({...item,deleted:false})},
 purge:async(id)=>{if(get().mode==='cloud'&&supabase){const {error}=await withRequestDeadline(signal=>supabase!.from('records').delete().eq('id',id).abortSignal(signal));if(error){set({error:error.message});throw new Error(error.message);}}set(s=>({items:s.items.filter(i=>i.id!==id)}))},
 connect:async(workspace,user)=>{set({loading:true,error:null});const {data,error}=await supabase!.from('records').select('*').eq('workspace_id',workspace);if(error){set({loading:false,error:error.message});return;}if(get().mode==='local')localItems=get().items;set({items:data||[],workspace,user,mode:'cloud',loading:false});},
 disconnect:()=>set({items:localItems,workspace:null,user:null,mode:'local',error:null})
}),{name:'gio-me-data',version:1,partialize:s=>({items:s.mode==='local'?s.items:[],mode:'local' as const})}));
export async function seedMissions(){const s=useData.getState();if(s.mode==='cloud'){const {error}=await supabase!.rpc('seed_missions',{target_workspace:s.workspace,seeds:missionSeeds});if(error)throw error;await s.connect(s.workspace!,s.user!);}else{if(localStorage.getItem('gio-me-seeded'))return;for(const mission of missionSeeds)await s.save(mission);localStorage.setItem('gio-me-seeded','yes');}}
export const emptyDraft=(kind:string):Draft=>({kind,title:'',body:'',date:new Date().toLocaleDateString('en-CA'),category:'',amount:0,done:false,private:false,data:{}});
export const money=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(n);
