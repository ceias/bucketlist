-- Run once after migrations 001–004. Does not alter workspace membership or Storage aliases.
begin;
create table public.couple_entries (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 owner_id uuid not null references auth.users(id),kind text not null check(kind in ('playlist','capsule','mood','place','idea','checklist','tradition','prompt','plan')),
 title text not null check(length(trim(title)) between 1 and 200),body text not null default '' check(length(body)<=20000),
 date date,unlock_at timestamptz,data jsonb not null default '{}' check(jsonb_typeof(data)='object' and octet_length(data::text)<=50000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(kind<>'capsule' or unlock_at is not null)
);
create index couple_entries_workspace on public.couple_entries(workspace_id,created_at desc);
alter table public.couple_entries enable row level security;
create policy entries_read on public.couple_entries for select to authenticated using(public.is_workspace_member(workspace_id) and (kind<>'capsule' or owner_id=auth.uid() or unlock_at<=now()));
-- All writes go through checked RPCs; direct browser writes are not granted.
create table public.couple_actions (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 owner_id uuid not null references auth.users(id),record_id uuid references public.records(id) on delete cascade,entry_id uuid references public.couple_entries(id) on delete cascade,
 target_key text generated always as (coalesce(record_id::text,entry_id::text,'heart')) stored,
 kind text not null check(kind in ('heart','reaction','comment','rsvp','task','answer')),key text not null default '' check(length(key)<=80),
 value jsonb not null default '{}' check(jsonb_typeof(value)='object' and octet_length(value::text)<=16000),shared boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((kind='heart' and record_id is null and entry_id is null) or (kind<>'heart' and num_nonnulls(record_id,entry_id)=1))
);
alter table public.couple_actions add constraint couple_actions_identity unique(owner_id,kind,target_key,key);
create index couple_actions_workspace on public.couple_actions(workspace_id,updated_at desc);
alter table public.couple_actions enable row level security;
create function public.couple_target_allowed(space uuid,record uuid,entry uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_workspace_member(space) and (
 (record is null and entry is null) or
 (record is not null and entry is null and exists(select 1 from records r where r.id=record and r.workspace_id=space and not r.private and not r.deleted)) or
 (entry is not null and record is null and exists(select 1 from couple_entries e where e.id=entry and e.workspace_id=space and (e.kind<>'capsule' or e.owner_id=auth.uid() or e.unlock_at<=now()))));
$$;
create policy actions_read on public.couple_actions for select to authenticated using(public.couple_target_allowed(workspace_id,record_id,entry_id) and (shared or owner_id=auth.uid()));
create table public.couple_activity (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 actor_id uuid not null references auth.users(id),actor_name text not null,label text not null,kind text not null,
 record_id uuid references public.records(id) on delete cascade,entry_id uuid references public.couple_entries(id) on delete cascade,created_at timestamptz not null default now()
);
create index couple_activity_workspace on public.couple_activity(workspace_id,created_at desc);
alter table public.couple_activity enable row level security;
create policy activity_read on public.couple_activity for select to authenticated using(public.couple_target_allowed(workspace_id,record_id,entry_id));
create table public.couple_inbox (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 recipient_id uuid not null references auth.users(id),actor_id uuid references auth.users(id),kind text not null check(kind in ('heart','reminder')),
 title text not null,body text not null default '',record_id uuid references public.records(id) on delete cascade,read_at timestamptz,created_at timestamptz not null default now()
);
alter table public.couple_inbox enable row level security;
create policy inbox_read on public.couple_inbox for select to authenticated using(recipient_id=auth.uid() and public.couple_target_allowed(workspace_id,record_id,null));
create table public.couple_preferences (user_id uuid primary key references auth.users(id) on delete cascade,reminders_enabled boolean not null default false);
alter table public.couple_preferences enable row level security;
create table public.couple_reminders (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 owner_id uuid not null references auth.users(id),record_id uuid not null references public.records(id) on delete cascade,due_at timestamptz not null,email boolean not null default false,
 in_app_sent_at timestamptz,status text not null default 'pending' check(status in ('pending','processing','retry','sent','skipped','failed')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),lease_token uuid,locked_at timestamptz,error_code text,provider_message_id text,
 created_at timestamptz not null default now(),unique(owner_id,record_id,due_at)
);
alter table public.couple_reminders enable row level security;
create policy reminders_read on public.couple_reminders for select to authenticated using(owner_id=auth.uid() and public.couple_target_allowed(workspace_id,record_id,null));
revoke all on public.couple_entries,public.couple_actions,public.couple_activity,public.couple_inbox,public.couple_preferences,public.couple_reminders from public,anon,authenticated;
grant select on public.couple_entries,public.couple_actions,public.couple_activity,public.couple_inbox,public.couple_reminders to authenticated;

create function public.save_couple_entry(entry jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare space uuid; result uuid; existing public.couple_entries; current_kind text;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select workspace_id into strict space from workspace_members where user_id=auth.uid();
 result:=coalesce((entry->>'id')::uuid,gen_random_uuid());current_kind:=entry->>'kind';
 select * into existing from couple_entries where id=result for update;
 if existing.id is not null and (existing.owner_id<>auth.uid() or existing.workspace_id<>space or existing.kind<>current_kind) then raise exception 'Only the author can edit this entry';end if;
 if current_kind='playlist' and coalesce(entry->'data'->>'url','')!~ '^https://' then raise exception 'Use an HTTPS song link';end if;
 if current_kind='place' and (jsonb_typeof(entry->'data'->'lat') is distinct from 'number' or jsonb_typeof(entry->'data'->'lng') is distinct from 'number' or abs((entry->'data'->>'lat')::numeric)>90 or abs((entry->'data'->>'lng')::numeric)>180) then raise exception 'Enter valid map coordinates';end if;
 if current_kind='capsule' and existing.id is not null and existing.unlock_at<=now() and (entry->>'unlock_at')::timestamptz>now() then raise exception 'An opened capsule cannot be sealed again';end if;
 insert into couple_entries(id,workspace_id,owner_id,kind,title,body,date,unlock_at,data)
 values(result,space,auth.uid(),current_kind,trim(entry->>'title'),coalesce(entry->>'body',''),nullif(entry->>'date','')::date,nullif(entry->>'unlock_at','')::timestamptz,coalesce(entry->'data','{}'))
 on conflict(id) do update set title=excluded.title,body=excluded.body,date=excluded.date,unlock_at=excluded.unlock_at,data=excluded.data,updated_at=now() where couple_entries.owner_id=auth.uid() and couple_entries.workspace_id=space and couple_entries.kind=current_kind;
 if not found then raise exception 'Only the author can edit this entry';end if;
 return result;
end;$$;
create function public.delete_couple_entry(entry_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 delete from couple_entries where id=entry_id and owner_id=auth.uid() and public.is_workspace_member(workspace_id);
 if not found then raise exception 'Entry unavailable or belongs to your partner';end if;
end;$$;
create function public.save_couple_action(action_kind text,record_id uuid,entry_id uuid,action_key text,action_value jsonb,is_shared boolean default true)
returns uuid language plpgsql security definer set search_path=public as $$
declare space uuid; result uuid; target_kind text;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 select workspace_id into strict space from workspace_members where user_id=auth.uid();
 perform 1 from couple_workspaces where id=space for update;
 if not public.couple_target_allowed(space,record_id,entry_id) then raise exception 'This shared item is unavailable';end if;
 if record_id is not null then select kind into target_kind from records where id=record_id;
 elsif entry_id is not null then select kind into target_kind from couple_entries where id=entry_id;end if;
 if action_kind in ('reaction','comment') and target_kind is distinct from 'gallery' then raise exception 'Photo interactions require a shared photo';end if;
 if action_kind='rsvp' and coalesce(target_kind,'') not in ('dates','calendar','bucket','plan') then raise exception 'Choose a shared plan';end if;
 if action_kind='rsvp' and coalesce(action_value->>'response','') not in ('in','maybe','alternative') then raise exception 'Choose a response';end if;
 if action_kind='rsvp' and action_value->>'response'='alternative' and nullif(action_value->>'date','')::date is null then raise exception 'Choose an alternative date';end if;
 if action_kind='task' and target_kind is distinct from 'checklist' then raise exception 'Choose a checklist';end if;
 if action_kind='answer' and target_kind is distinct from 'prompt' then raise exception 'Choose a memory prompt';end if;
 if action_kind='reaction' and (action_key<>'heart' or jsonb_typeof(action_value->'active') is distinct from 'boolean') then raise exception 'Choose a heart reaction';end if;
 if action_kind='task' and (jsonb_typeof(action_value->'done') is distinct from 'boolean' or not exists(select 1 from couple_entries e,jsonb_array_elements(e.data->'tasks') t where e.id=entry_id and t->>'id'=action_key)) then raise exception 'Choose a valid checklist task';end if;
 if action_kind='answer' and length(trim(coalesce(action_value->>'text',''))) not between 1 and 4000 then raise exception 'Write an answer of 1–4000 characters';end if;
 if action_kind='comment' and length(trim(coalesce(action_value->>'text',''))) not between 1 and 2000 then raise exception 'Write a comment of 1–2000 characters';end if;
 if action_kind='heart' and exists(select 1 from couple_actions where owner_id=auth.uid() and kind='heart' and created_at>now()-interval '10 seconds') then raise exception 'Give your little heart a moment before sending another';end if;
 insert into couple_actions(workspace_id,owner_id,record_id,entry_id,kind,key,value,shared)
 values(space,auth.uid(),record_id,entry_id,action_kind,action_key,action_value,is_shared)
 on conflict on constraint couple_actions_identity
 do update set value=excluded.value,shared=excluded.shared,updated_at=now() returning id into result;
 return result;
end;$$;

create function public.log_couple_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare who uuid:=auth.uid(); space uuid; record uuid; entry uuid; item_kind text; description text; actor text;
begin
 if who is null then return new;end if;
 space:=new.workspace_id;
 if not public.is_workspace_member(space) then return new;end if;
 select left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Your partner'),80) into actor from auth.users where id=who;
 if tg_table_name='records' then
  if new.private or new.deleted then return new;end if;
  record:=new.id;item_kind:=new.kind;
  description:=case when tg_op='INSERT' then 'Added a '||case when new.kind='gallery' then 'photo' else new.kind end when new.done and not old.done then 'Completed a '||new.kind else 'Updated a '||new.kind end;
 elsif tg_table_name='couple_entries' then
  entry:=new.id;item_kind:=new.kind;description:=case when tg_op='INSERT' then 'Added ' else 'Updated ' end||case when new.kind='capsule' then 'a sealed surprise' else new.kind end;
 else
  if new.kind not in ('heart','comment','reaction','rsvp') or not new.shared then return new;end if;
  record:=new.record_id;entry:=new.entry_id;item_kind:=new.kind;
  description:=case new.kind when 'heart' then 'Sent a thinking-of-you heart' when 'comment' then 'Left a photo comment' when 'reaction' then 'Reacted to a photo' else 'Responded to a plan' end;
  if new.kind='heart' and tg_op='INSERT' then
   insert into couple_inbox(workspace_id,recipient_id,actor_id,kind,title,body)
   select space,m.user_id,who,'heart',actor||' is thinking of you ♡','A little heart, just for you.' from workspace_members m where m.workspace_id=space and m.user_id<>who;
  end if;
 end if;
 insert into couple_activity(workspace_id,actor_id,actor_name,label,kind,record_id,entry_id) values(space,who,coalesce(actor,'Your partner'),description,item_kind,record,entry);
 return new;
end;$$;
create trigger couple_record_activity after insert or update on public.records for each row execute function public.log_couple_activity();
create trigger couple_entry_activity after insert or update on public.couple_entries for each row execute function public.log_couple_activity();
create trigger couple_action_activity after insert or update on public.couple_actions for each row execute function public.log_couple_activity();
create function public.couple_members(target_workspace uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_workspace_member(target_workspace) then raise exception 'Workspace access denied';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',left(coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'),''),'Your partner'),80),'joined_at',m.joined_at)) from workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=target_workspace),'[]');
end;$$;
create function public.set_couple_reminders(enabled boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or enabled is null then raise exception 'Sign in and choose a preference';end if;
 insert into couple_preferences(user_id,reminders_enabled) values(auth.uid(),enabled) on conflict(user_id) do update set reminders_enabled=excluded.reminders_enabled;
 if not enabled then update couple_reminders set status='skipped',error_code='opted_out' where owner_id=auth.uid() and status in ('pending','retry','processing');end if;
end;$$;
create function public.schedule_couple_reminder(record_id uuid,due_at timestamptz,email boolean default false) returns uuid language plpgsql security definer set search_path=public as $$
declare item public.records; result uuid;
begin
 select * into item from records where id=record_id;
 if item.id is null or not public.couple_target_allowed(item.workspace_id,item.id,null) or item.kind not in ('bucket','calendar','dates') then raise exception 'Choose a shared agenda';end if;
 if item.kind='bucket' and item.data->>'datePrecision'='month' then raise exception 'Choose a specific day before scheduling a reminder';end if;
 if due_at is null or due_at<=now() or due_at>now()+interval '2 years' then raise exception 'Choose a future reminder within two years';end if;
 if not exists(select 1 from couple_preferences where user_id=auth.uid() and reminders_enabled) then raise exception 'Enable your reminders first';end if;
 if email and not exists(select 1 from agenda_email_preferences p join auth.users u on u.id=p.user_id where p.user_id=auth.uid() and p.enabled and u.email_confirmed_at is not null) then raise exception 'Enable email alerts with a confirmed account first';end if;
 insert into couple_reminders(workspace_id,owner_id,record_id,due_at,email) values(item.workspace_id,auth.uid(),item.id,due_at,email) returning id into result;
 return result;
end;$$;
create function public.cancel_couple_reminder(reminder_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update couple_reminders set status='skipped',error_code='cancelled' where id=reminder_id and owner_id=auth.uid();
end;$$;
create function public.read_couple_inbox() returns void language plpgsql security definer set search_path=public as $$
begin update couple_inbox set read_at=now() where recipient_id=auth.uid() and read_at is null and public.is_workspace_member(workspace_id);end;$$;
-- Invoker rights keep RLS active when packaging the browser's dashboard response.
create function public.get_couple_space(target_workspace uuid) returns jsonb language plpgsql set search_path=public as $$
begin
 if not public.is_workspace_member(target_workspace) then raise exception 'Workspace access denied';end if;
 return jsonb_build_object(
 'entries',coalesce((select jsonb_agg(t) from (select * from couple_entries where workspace_id=target_workspace order by created_at desc limit 500) t),'[]'),
 'actions',coalesce((select jsonb_agg(t) from (select * from couple_actions where workspace_id=target_workspace order by updated_at desc limit 2000) t),'[]'),
 'activity',coalesce((select jsonb_agg(t) from (select * from couple_activity where workspace_id=target_workspace order by created_at desc limit 200) t),'[]'),
 'inbox',coalesce((select jsonb_agg(t) from (select * from couple_inbox where workspace_id=target_workspace order by created_at desc limit 100) t),'[]'),
 'reminders',coalesce((select jsonb_agg(t) from (select id,record_id,due_at,email,in_app_sent_at,status,error_code from couple_reminders where workspace_id=target_workspace and owner_id=auth.uid() order by due_at limit 200) t),'[]'),
 'members',public.couple_members(target_workspace),'reminderReady',public.get_couple_reminder_delivery_ready(),'remindersEnabled',public.get_couple_reminder_preference());
end;$$;
create function public.get_couple_reminder_preference() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select reminders_enabled from couple_preferences where user_id=auth.uid()),false);
$$;
-- A date change shifts pending reminders by the same number of days, preserving history.
create function public.shift_couple_reminders() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.date is distinct from old.date and new.date is not null and old.date is not null then
 update couple_reminders set due_at=due_at+(new.date-old.date)*interval '1 day' where record_id=new.id and status in ('pending','retry') and in_app_sent_at is null;
 end if;return new;
end;$$;
create trigger shift_couple_reminders after update of date on public.records for each row execute function public.shift_couple_reminders();
-- No client may send emails or write another user's reminder or notification.
create function public.dispatch_couple_reminders() returns void language plpgsql security definer set search_path=public as $$
declare job public.couple_reminders;
begin
 update couple_reminders j set status='skipped',error_code='ineligible' where status in ('pending','retry','processing') and (
 not exists(select 1 from couple_preferences p where p.user_id=j.owner_id and p.reminders_enabled) or
 not exists(select 1 from workspace_members m where m.user_id=j.owner_id and m.workspace_id=j.workspace_id) or
 not exists(select 1 from records r where r.id=j.record_id and r.workspace_id=j.workspace_id and not r.private and not r.deleted and not r.done));
 for job in select * from couple_reminders where due_at<=now() and status in ('pending','retry') and in_app_sent_at is null order by due_at for update skip locked limit 100 loop
  insert into couple_inbox(workspace_id,recipient_id,kind,title,body,record_id) values(job.workspace_id,job.owner_id,'reminder','A little time for us ♡','Your agenda reminder is ready. Open the plan to see the details.',job.record_id);
  update couple_reminders set in_app_sent_at=now(),status=case when email then 'pending' else 'sent' end where id=job.id;
 end loop;
end;$$;
create table public.couple_worker_state(singleton boolean primary key default true check(singleton),last_seen_at timestamptz);
insert into public.couple_worker_state(singleton) values(true);
alter table public.couple_worker_state enable row level security;
revoke all on public.couple_worker_state from public,anon,authenticated;
create function public.get_couple_reminder_delivery_ready() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select last_seen_at>now()-interval '10 minutes' from couple_worker_state where singleton),false);
$$;
revoke all on function public.get_couple_reminder_delivery_ready() from public,anon;
grant execute on function public.get_couple_reminder_delivery_ready() to authenticated;
create function public.claim_couple_reminder_emails() returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 update couple_worker_state set last_seen_at=now() where singleton;
 perform public.dispatch_couple_reminders();
 update couple_reminders set status='failed',error_code='expired' where status in ('pending','retry','processing') and due_at<now()-interval '23 hours';
 update couple_reminders set status=case when attempts>=5 then 'failed' else 'retry' end,lease_token=null,locked_at=null,next_attempt_at=now() where status='processing' and locked_at<now()-interval '3 minutes';
 update couple_reminders j set status='skipped',error_code='email_opted_out' where status in ('pending','retry') and email and not exists(select 1 from agenda_email_preferences p join auth.users u on u.id=p.user_id where p.user_id=j.owner_id and p.enabled and u.email_confirmed_at is not null and nullif(u.email,'') is not null);
 with candidates as(select id from couple_reminders where status in ('pending','retry') and email and in_app_sent_at is not null and due_at<=now() and next_attempt_at<=now() and attempts<5 order by due_at for update skip locked limit 3),
 leased as(update couple_reminders j set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),locked_at=now() from candidates c where j.id=c.id returning j.*)
 select jsonb_agg(jsonb_build_object('job_id',l.id,'token',l.lease_token,'notice_id',l.id,'recipient_email',u.email,'recipient_name',left(coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'),''),'my love'),80),'actor_name','You','item_count',1,'app_kind',r.kind,'event_type','reminder')) into result from leased l join auth.users u on u.id=l.owner_id join records r on r.id=l.record_id;
 return coalesce(result,'[]');
end;$$;
create function public.couple_reminder_eligible(job uuid,token uuid,expected_email text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from couple_reminders j join couple_preferences c on c.user_id=j.owner_id join agenda_email_preferences p on p.user_id=j.owner_id join auth.users u on u.id=j.owner_id join records r on r.id=j.record_id where j.id=job and j.lease_token=token and j.status='processing' and c.reminders_enabled and p.enabled and u.email_confirmed_at is not null and lower(u.email)=lower(expected_email) and r.workspace_id=j.workspace_id and not r.private and not r.deleted and not r.done and exists(select 1 from workspace_members m where m.user_id=j.owner_id and m.workspace_id=j.workspace_id));
$$;
create function public.finish_couple_reminder(job uuid,token uuid,outcome text,provider_id text default null,failure_code text default null) returns void language plpgsql security definer set search_path=public as $$
begin
 if outcome not in ('sent','retry','failed','skipped') then raise exception 'Invalid outcome';end if;
 update couple_reminders set status=case when outcome='retry' and attempts>=5 then 'failed' else outcome end,provider_message_id=left(provider_id,200),error_code=left(failure_code,80),next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,attempts)::integer)),lease_token=null,locked_at=null where id=job and lease_token=token and status='processing';
end;$$;
-- Explicit grants: browser RPCs versus service-only scheduled delivery.
revoke all on function public.couple_target_allowed(uuid,uuid,uuid),public.save_couple_entry(jsonb),public.delete_couple_entry(uuid),public.save_couple_action(text,uuid,uuid,text,jsonb,boolean),public.log_couple_activity(),public.couple_members(uuid),public.set_couple_reminders(boolean),public.schedule_couple_reminder(uuid,timestamptz,boolean),public.cancel_couple_reminder(uuid),public.read_couple_inbox(),public.get_couple_space(uuid),public.get_couple_reminder_preference(),public.shift_couple_reminders(),public.dispatch_couple_reminders(),public.claim_couple_reminder_emails(),public.couple_reminder_eligible(uuid,uuid,text),public.finish_couple_reminder(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.couple_target_allowed(uuid,uuid,uuid),public.save_couple_entry(jsonb),public.delete_couple_entry(uuid),public.save_couple_action(text,uuid,uuid,text,jsonb,boolean),public.couple_members(uuid),public.set_couple_reminders(boolean),public.schedule_couple_reminder(uuid,timestamptz,boolean),public.cancel_couple_reminder(uuid),public.read_couple_inbox(),public.get_couple_space(uuid),public.get_couple_reminder_preference() to authenticated;
grant execute on function public.dispatch_couple_reminders(),public.claim_couple_reminder_emails(),public.couple_reminder_eligible(uuid,uuid,text),public.finish_couple_reminder(uuid,uuid,text,text,text) to service_role;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 alter publication supabase_realtime add table public.couple_entries,public.couple_actions,public.couple_activity,public.couple_inbox;
 end if;
end;$$;
notify pgrst,'reload schema';
commit;
