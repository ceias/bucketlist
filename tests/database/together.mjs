import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const space='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const photo='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',plan='cccccccc-cccc-4ccc-8ccc-cccccccccccc',capsule='dddddddd-dddd-4ddd-8ddd-dddddddddddd',prompt='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
async function admin(){await db.exec('reset role');await db.exec("set request.jwt.claim.sub = ''")}
async function scalar(sql,args=[]){return (await db.query(sql,args)).rows[0]?.value}
async function rpc(sql,args=[]){return (await db.query(sql,args)).rows[0]}
try{
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create schema extensions;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth,storage to authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
create function extensions.gen_random_bytes(integer) returns bytea language sql as $$select decode(repeat('ab',$1),'hex')$$;
create function extensions.digest(text,text) returns bytea language sql immutable as $$select decode(md5($1),'hex')$$;`);
for(const name of ['202610310001_initial_workspace.sql','202611010002_partner_welcome_and_notifications.sql','202611010003_agenda_email_delivery.sql','202611010004_own_agenda_confirmations.sql','202611010005_together_space.sql']){
 let sql=await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8');
 sql=sql.replace('create extension if not exists pgcrypto with schema extensions;','');
 await db.exec(sql);console.log('Applied',name);
}
await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'a@example.com',now(),'{"display_name":"Bri"}'),($2,'b@example.com',now(),'{"display_name":"Gio"}'),($3,'c@example.com',now(),'{}')`,[A,B,C]);
await db.query(`insert into public.couple_workspaces(id,name,created_by) values($1,'Our space',$2);`,[space,A]);
await db.query('insert into workspace_members(workspace_id,user_id) values($1,$2),($1,$3)',[space,A,B]);
await as(B);await db.query(`insert into records(id,workspace_id,owner_id,kind,title,date,data) values($1,$2,$3,'gallery','Ramen Date','2026-11-01','{"path":"old/photo.jpg"}')`,[photo,space,B]);
await as(A);
await assert.rejects(db.query(`insert into records(id,workspace_id,owner_id,kind,title,date) values($1,$2,$3,'gallery','Ramen Date','2026-11-01') on conflict(id) do update set title=excluded.title`,[photo,space,B]),/row-level security/);
await db.query('update records set done=true where id=$1',[photo]);
assert.equal(await scalar('select done as value from records where id=$1',[photo]),true);
await rpc('select save_couple_entry($1::jsonb)',[JSON.stringify({id:capsule,kind:'capsule',title:'Secret title',body:'SEALED LETTER',unlock_at:'2099-01-01T00:00:00Z',data:{}})]);
await rpc('select save_couple_entry($1::jsonb)',[JSON.stringify({id:prompt,kind:'prompt',title:'What made you smile?',data:{}})]);
await rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['answer',null,prompt,'answer',JSON.stringify({text:'PRIVATE ANSWER'}),false]);
await as(B);
assert.equal(await scalar('select count(*)::int as value from couple_entries where id=$1',[capsule]),0);
assert.equal(await scalar('select count(*)::int as value from couple_actions where entry_id=$1',[prompt]),0);
await assert.rejects(rpc('select save_couple_entry($1::jsonb)',[JSON.stringify({id:capsule,kind:'capsule',title:'Steal',unlock_at:'2099-01-01',data:{}})]),/Only the author/);
await assert.rejects(rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['answer',null,capsule,'answer','{"text":"peek"}',true]),/unavailable/);
await as(A);await rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['answer',null,prompt,'answer','{"text":"SHARED ANSWER"}',true]);
await as(B);assert.equal(await scalar('select count(*)::int as value from couple_actions where entry_id=$1',[prompt]),1);
await rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['comment',photo,null,'comment-1','{"text":"Love this day"}',true]);
await rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['heart',null,null,'heart-1','{}',true]);
await as(A);assert.equal(await scalar("select count(*)::int as value from couple_inbox where kind='heart'"),1);
let dashboard=await scalar('select get_couple_space($1) as value',[space]);assert.equal(dashboard.members.length,2);assert.equal(dashboard.inbox.length,1);
await rpc('select set_couple_reminders(true)');await rpc('select set_agenda_email_preference(true)');
await db.query(`insert into records(id,workspace_id,owner_id,kind,title,date) values($1,$2,$3,'dates','Our date',current_date+1)`,[plan,space,A]);
const reminder=await scalar("select schedule_couple_reminder($1,now()+interval '1 hour',true) as value",[plan]);
await admin();await db.query("update couple_reminders set due_at=now()-interval '1 minute' where id=$1",[reminder]);
await db.exec('select dispatch_couple_reminders();select dispatch_couple_reminders();');
assert.equal(await scalar("select count(*)::int as value from couple_inbox where kind='reminder'"),1);
let jobs=await scalar('select claim_couple_reminder_emails() as value');assert.equal(jobs.length,1);assert.equal(jobs[0].event_type,'reminder');
assert.equal(await scalar('select couple_reminder_eligible($1,$2,$3) as value',[jobs[0].job_id,jobs[0].token,'a@example.com']),true);
await rpc('select finish_couple_reminder($1,$2,$3,$4,$5)',[jobs[0].job_id,jobs[0].token,'sent','provider-id',null]);
assert.deepEqual(await scalar('select claim_couple_reminder_emails() as value'),[]);
await as(A);
const list='ffffffff-ffff-4fff-8fff-ffffffffffff';
await rpc('select save_couple_entry($1::jsonb)',[JSON.stringify({id:list,kind:'checklist',title:'Our packing',data:{tasks:[{id:'camera',text:'Bring camera',assignee:B}]}})]);
await as(B);await rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['task',null,list,'camera','{"done":true}',true]);
await assert.rejects(rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['task',null,list,'missing','{"done":true}',true]),/valid checklist task/);
await assert.rejects(rpc('select save_couple_action($1,$2,$3,$4,$5::jsonb,$6)',['reaction',photo,null,'heart','{"active":"yes"}',true]),/heart reaction/);
await admin();await db.query("update couple_entries set unlock_at=now()-interval '1 minute' where id=$1",[capsule]);await as(B);
assert.equal(await scalar('select body as value from couple_entries where id=$1',[capsule]),'SEALED LETTER');
await as(A);await rpc('select set_couple_reminders(true)');
const secondReminder=await scalar("select schedule_couple_reminder($1,now()+interval '2 hours',false) as value",[plan]);
const before=await scalar('select due_at::text as value from couple_reminders where id=$1',[secondReminder]);
await db.query('update records set date=date+2 where id=$1',[plan]);
const after=await scalar('select due_at::text as value from couple_reminders where id=$1',[secondReminder]);
assert.equal(new Date(after)-new Date(before),172800000);
await rpc('select set_couple_reminders(false)');assert.equal(await scalar('select status as value from couple_reminders where id=$1',[secondReminder]),'skipped');
await as(C);assert.equal(await scalar('select count(*)::int as value from couple_entries'),0);await assert.rejects(rpc('select get_couple_space($1)',[space]),/access denied/);await assert.rejects(rpc('select claim_couple_reminder_emails()'),/permission denied/);
console.log('PASS: migrations, partner photo update, sealed letters, private answers, shared comments, hearts, roster, reminder deduplication/delivery and outsider access.');
}finally{await db.close()}
