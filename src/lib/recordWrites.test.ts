import { describe,it,expect,vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Item } from '../stores/data';
import { writeCloudRecords } from './recordWrites';
const photo:Item={id:'photo',kind:'gallery',title:'Ramen Date',body:'Our day',date:'2026-11-01',category:'Little Moments',amount:0,done:false,private:false,data:{path:'old-workspace/partner/photo.jpg'},workspace_id:'shared',owner_id:'partner'};
function database(fail=false){
 const filters:Record<string,string>={};const updates:unknown[]=[];const inserts:any[]=[];
 const query={eq:vi.fn((key:string,value:string)=>{filters[key]=value;return query}),select:vi.fn(()=>query),abortSignal:vi.fn(()=>query),single:vi.fn(async()=>({data:fail?null:{id:'photo'},error:fail?{message:'Record unavailable'}:null})),then(resolve:any,reject:any){return Promise.resolve({error:null}).then(resolve,reject)}};
 const from=vi.fn(()=>({update:vi.fn((row:unknown)=>{updates.push(row);return query}),upsert:vi.fn((rows:any[])=>{inserts.push(...rows);if(rows.some(row=>row.owner_id!=='me'))throw Error('INSERT owner policy');return query})}));
 return {client:{from} as unknown as Pick<SupabaseClient,'from'>,filters,updates,inserts};
}
describe('shared record writes',()=>{
 it('updates a partner photo without INSERT checks or changing its owner/path',async()=>{const db=database();await writeCloudRecords(db.client,[{...photo,done:true}],new Set(['photo']),'shared','me');expect(db.inserts).toEqual([]);expect(db.filters).toEqual({workspace_id:'shared',id:'photo'});expect(db.updates[0]).toMatchObject({done:true,data:photo.data});expect(db.updates[0]).not.toHaveProperty('owner_id');expect(db.updates[0]).not.toHaveProperty('workspace_id');expect(photo.owner_id).toBe('partner');});
 it('keeps new bulk inserts batched and owned by the signed-in user',async()=>{const db=database();await writeCloudRecords(db.client,[{...photo,id:'new1'},{...photo,id:'new2'}],new Set(),'shared','me');expect(db.updates).toEqual([]);expect(db.client.from).toHaveBeenCalledTimes(1);expect(db.inserts.map(row=>[row.id,row.workspace_id,row.owner_id])).toEqual([['new1','shared','me'],['new2','shared','me']]);});
 it('uses UPDATE for partner-owned bulk corrections as well as single edits',async()=>{const db=database();await writeCloudRecords(db.client,[photo,{...photo,id:'second'}],new Set(['photo','second']),'shared','me');expect(db.updates).toHaveLength(2);expect(db.inserts).toHaveLength(0);});
 it('reports inaccessible or deleted records instead of silently claiming a successful update',async()=>{const db=database(true);await expect(writeCloudRecords(db.client,[photo],new Set(['photo']),'shared','me')).rejects.toMatchObject({message:'Record unavailable'});});
});
