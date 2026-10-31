import type { SupabaseClient } from '@supabase/supabase-js';
import type { Item } from '../stores/data';
import { withRequestDeadline } from './requestDeadline';

/** Existing shared records must use UPDATE: UPSERT also checks the owner-only INSERT policy. */
export async function writeCloudRecords(client:Pick<SupabaseClient,'from'>, rows:Item[], existingIds:Set<string>, workspace:string, user:string) {
  for(const row of rows.filter(row=>existingIds.has(row.id))) {
    const {kind,title,body,date,category,amount,done,private:privateFlag,data,deleted}=row;
    const {error}=await withRequestDeadline(signal=>client.from('records')
      .update({kind,title,body,date,category,amount,done,private:privateFlag,data,deleted:!!deleted})
      .eq('workspace_id',workspace).eq('id',row.id).select('id').abortSignal(signal).single());
    if(error)throw error;
  }
  const added=rows.filter(row=>!existingIds.has(row.id));
  if(added.length) {
    // Stable IDs keep new bulk-import retries idempotent. New records always belong to this user.
    const {error}=await withRequestDeadline(signal=>client.from('records')
      .upsert(added.map(row=>({...row,workspace_id:workspace,owner_id:user}))).abortSignal(signal));
    if(error)throw error;
  }
}
