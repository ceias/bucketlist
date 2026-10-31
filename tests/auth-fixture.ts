import type { Page } from '@playwright/test';
import { PARTNER_WELCOME_TITLE, PARTNER_WELCOME_MESSAGE } from '../src/auth/copy';
export const inviteCode='a'.repeat(48);
export async function mockSharedAccount(page:Page,{signedIn=false,member=false,expired=false}:{signedIn?:boolean;member?:boolean;expired?:boolean}={}) {
  await page.addInitScript(({signedIn,member,expired,title,message})=>{
    const session={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id:'gio-user',email:'gio@example.com',email_confirmed_at:'2026-11-01T00:00:00Z',user_metadata:{display_name:'Gio'}}};
    (window as any).__loveTest={session:signedIn?session:null,member,expired,title,message,notices:[],channels:[],accepted:0};
  },{signedIn,member,expired,title:PARTNER_WELCOME_TITLE,message:PARTNER_WELCOME_MESSAGE});
  await page.route('**/src/lib/supabase.ts*',route=>route.fulfill({contentType:'application/javascript',body:`
const state=window.__loveTest;const listeners=new Set();
const emit=(event)=>{for(const fn of listeners)fn(event,state.session)};
function signIn(email,name='Gio'){state.session={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id:'gio-user',email,email_confirmed_at:'2026-11-01T00:00:00Z',user_metadata:{display_name:name}}};emit('SIGNED_IN');return {data:{session:state.session,user:state.session.user},error:null}}
export const supabase={auth:{
getSession:async()=>({data:{session:state.session},error:null}),onAuthStateChange(fn){listeners.add(fn);queueMicrotask(()=>fn('INITIAL_SESSION',state.session));return {data:{subscription:{unsubscribe(){listeners.delete(fn)}}}}},
signInWithPassword:async({email})=>signIn(email),signUp:async({email,options})=>signIn(email,options.data.display_name),signOut:async()=>{state.session=null;emit('SIGNED_OUT');return {error:null}},
updateUser:async({data})=>{if(data)Object.assign(state.session.user.user_metadata,data);emit('USER_UPDATED');return {data:{user:state.session.user},error:null}},refreshSession:async()=>({data:{session:state.session},error:null}),resetPasswordForEmail:async()=>({data:{},error:null})},
from(table){const filters=[];let patch;const query={select(){return this},eq(key,value){filters.push([key,value]);return this},is(key,value){filters.push([key,value]);return this},order(){return this},limit(){return this},single(){this.one=true;return this},upsert(rows){this.added=rows;return this},abortSignal(){return this},update(value){patch=value;return this},then(resolve,reject){let data=[];
if(table==='records'){state.records??=[];if(this.added){if(this.added.some(row=>row.owner_id!==state.session.user.id))return Promise.resolve({data:null,error:{message:'INSERT owner policy rejected'}}).then(resolve,reject);for(const row of this.added){const index=state.records.findIndex(r=>r.id===row.id);if(index<0)state.records.push(row);else state.records[index]=row;}}if(patch)for(const row of state.records)if(filters.every(([key,value])=>row[key]===value))Object.assign(row,patch);data=state.records.filter(row=>filters.every(([key,value])=>row[key]===value));if(this.one)data=data[0]??null;}
if(table==='workspace_members')data=state.member?[{workspace_id:'our-workspace'}]:[];
if(table==='notifications'){if(patch)for(const n of state.notices)if(filters.every(([key,value])=>n[key]===value))Object.assign(n,patch);data=state.notices.filter(n=>filters.every(([key,value])=>n[key]===value));}
return Promise.resolve({data,error:null}).then(resolve,reject)}};return query;},
rpc:async(name,args)=>{if(name==='preview_partner_invitation')return state.expired?{data:null,error:{message:'This invitation has expired or was already accepted.'}}:{data:{inviter_name:'Brisias',workspace_name:'Our Little Corner',partner_name:'Gio',welcome_title:state.title,welcome_message:state.message,expires_at:'2027-12-31T00:00:00Z'},error:null};
if(name==='get_agenda_email_preference')return {data:{enabled:!!state.emailEnabled,self_confirmations:!!state.selfConfirmations,delivery_ready:!!state.emailReady},error:null};
if(name==='set_agenda_self_confirmation'){state.selfConfirmations=args.email_enabled;return {data:{enabled:!!state.emailEnabled,self_confirmations:state.selfConfirmations,delivery_ready:!!state.emailReady},error:null}};
if(name==='set_agenda_email_preference'){state.emailEnabled=args.email_enabled;return {data:{enabled:state.emailEnabled,self_confirmations:!!state.selfConfirmations,delivery_ready:!!state.emailReady},error:null}};
if(name==='create_workspace'){state.member=true;return {data:'our-workspace',error:null}};
if(name==='create_partner_invitation')return {data:'${inviteCode}',error:null};
if(name==='accept_partner_invitation'){state.member=true;state.accepted++;Object.assign(state.session.user.user_metadata,{welcome_title:state.title,welcome_message:state.message});return {data:{workspace_id:'our-workspace',metadata:state.session.user.user_metadata},error:null}};
return {data:null,error:{message:'Unexpected RPC '+name}};},
storage:{from(){return {createSignedUrl:async()=>({data:{signedUrl:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'},error:null})}}},
channel(name){const channel={name,on(type,filter,callback){state.channels.push({channel,filter,callback});return this},subscribe(){return this}};return channel},removeChannel(channel){state.channels=state.channels.filter(c=>c.channel!==channel);return Promise.resolve()}};
state.sendNotice=notice=>{state.notices.unshift(notice);for(const entry of state.channels)if(entry.filter.table==='notifications')entry.callback({new:notice})};
` }));
}
