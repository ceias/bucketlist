-- Run ONCE after migration 003. Keeps the existing worker, secrets and schedule.
begin;
alter table public.agenda_email_preferences add column self_confirmations boolean not null default false;
alter table public.agenda_email_jobs alter column notification_id drop not null;
alter table public.agenda_email_jobs add column self_recipient_id uuid references auth.users(id) on delete cascade;
alter table public.agenda_email_jobs add column self_workspace_id uuid references public.couple_workspaces(id) on delete cascade;
alter table public.agenda_email_jobs add column self_record_id uuid references public.records(id) on delete set null;
alter table public.agenda_email_jobs add column self_item_count integer check(self_item_count>0);
alter table public.agenda_email_jobs add column self_app_kind text check(self_app_kind in ('bucket','calendar','dates'));
alter table public.agenda_email_jobs add constraint agenda_email_job_context check(
 (notification_id is not null and self_recipient_id is null and self_workspace_id is null and self_record_id is null and self_item_count is null and self_app_kind is null) or
 (notification_id is null and self_recipient_id is not null and self_workspace_id is not null and self_item_count is not null and self_app_kind is not null)
);
create unique index agenda_email_self_source on public.agenda_email_jobs(self_recipient_id,self_workspace_id,self_record_id,self_app_kind) where notification_id is null;
-- Service-only view unifies partner alerts and own confirmations without creating self-notifications in the bell.
create view public.agenda_email_context as
 select j.id as job_id,n.recipient_id,n.actor_id,n.workspace_id,n.actor_name,n.item_count,n.app_kind,n.id as notice_id,false as is_self
 from public.agenda_email_jobs j join public.notifications n on n.id=j.notification_id
 union all
 select j.id,j.self_recipient_id,j.self_recipient_id,j.self_workspace_id,'You'::text,j.self_item_count,j.self_app_kind,j.id,true
 from public.agenda_email_jobs j where j.notification_id is null;
revoke all on public.agenda_email_context from public,anon,authenticated;

create or replace function public.get_agenda_email_preference() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 return jsonb_build_object('enabled',coalesce((select enabled from agenda_email_preferences where user_id=auth.uid()),false),
 'self_confirmations',coalesce((select self_confirmations from agenda_email_preferences where user_id=auth.uid()),false),
 'delivery_ready',coalesce((select last_seen_at>now()-interval '10 minutes' from agenda_email_worker_state where singleton),false),
 'test_mode',coalesce((select test_mode from agenda_email_worker_state where singleton),true));
end;$$;
create or replace function public.set_agenda_email_preference(email_enabled boolean) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if email_enabled is null then raise exception 'Choose an email preference';end if;
 if email_enabled and not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and nullif(email,'') is not null) then raise exception 'Confirm your account email before enabling agenda emails';end if;
 insert into agenda_email_preferences(user_id,enabled) values(auth.uid(),email_enabled) on conflict(user_id) do update set enabled=excluded.enabled,updated_at=now();
 if not email_enabled then update agenda_email_jobs j set status='skipped',error_code='opted_out' from agenda_email_context c
 where c.job_id=j.id and c.recipient_id=auth.uid() and j.status in ('pending','retry');end if;
 return public.get_agenda_email_preference();
end;$$;
create function public.set_agenda_self_confirmation(email_enabled boolean) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if email_enabled is null then raise exception 'Choose a confirmation preference';end if;
 if email_enabled and not exists(select 1 from agenda_email_preferences where user_id=auth.uid() and enabled) then raise exception 'Enable email alerts first';end if;
 if email_enabled and not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirm your account email first';end if;
 insert into agenda_email_preferences(user_id,self_confirmations) values(auth.uid(),email_enabled)
 on conflict(user_id) do update set self_confirmations=excluded.self_confirmations,updated_at=now();
 if not email_enabled then update agenda_email_jobs set status='skipped',error_code='self_opted_out' where self_recipient_id=auth.uid() and status in ('pending','retry');end if;
 return public.get_agenda_email_preference();
end;$$;
create function public.queue_own_agenda_confirmation() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from agenda_email_preferences where user_id=actor and enabled and self_confirmations) then return null;end if;
 insert into agenda_email_jobs(self_recipient_id,self_workspace_id,self_record_id,self_item_count,self_app_kind)
 select actor,r.workspace_id,min(r.id::text)::uuid,count(*)::integer,r.kind from self_added_agendas r
 where r.owner_id=actor and r.kind in ('bucket','calendar','dates') and not r.private and not r.deleted
 and public.is_workspace_member(r.workspace_id) group by r.workspace_id,r.kind on conflict do nothing;
 return null;
end;$$;
create trigger queue_own_agenda_insert after insert on public.records referencing new table as self_added_agendas
 for each statement execute function public.queue_own_agenda_confirmation();

-- Preserve the worker RPC signature: its existing idempotent sender can process both kinds.
create or replace function public.claim_agenda_emails(batch_size integer default 5,test_mode boolean default true)
returns table(job_id uuid,token uuid,notice_id uuid,recipient_email text,recipient_name text,actor_name text,item_count integer,app_kind text)
language plpgsql security definer set search_path=public as $$
begin
 update agenda_email_worker_state set last_seen_at=now(),test_mode=claim_agenda_emails.test_mode where singleton;
 update agenda_email_jobs set status='failed',error_code='expired' where status in ('pending','retry','processing') and created_at<now()-interval '23 hours';
 update agenda_email_jobs set status=case when attempts>=5 then 'failed' else 'retry' end,lease_token=null,locked_at=null,next_attempt_at=now(),error_code='lease_expired'
 where status='processing' and locked_at<now()-interval '3 minutes';
 update agenda_email_jobs j set status='skipped',error_code='recipient_ineligible' from agenda_email_context c
 where j.id=c.job_id and j.status in ('pending','retry') and (
 not exists(select 1 from agenda_email_preferences p where p.user_id=c.recipient_id and p.enabled and (not c.is_self or p.self_confirmations)) or
 not exists(select 1 from auth.users u where u.id=c.recipient_id and u.email_confirmed_at is not null and nullif(u.email,'') is not null) or
 not exists(select 1 from workspace_members m where m.workspace_id=c.workspace_id and m.user_id=c.recipient_id) or
 not exists(select 1 from workspace_members m where m.workspace_id=c.workspace_id and m.user_id=c.actor_id));
 return query with candidates as (
 select j.id from agenda_email_jobs j where j.status in ('pending','retry') and j.next_attempt_at<=now() and j.attempts<5
 order by j.created_at for update skip locked limit greatest(1,least(coalesce(batch_size,5),5))
 ), leased as (
 update agenda_email_jobs j set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),locked_at=now()
 from candidates c where j.id=c.id returning j.id,j.lease_token
 )
 select l.id,l.lease_token,c.notice_id,u.email::text,left(coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'),''),'my love'),80),c.actor_name,c.item_count,c.app_kind
 from leased l join agenda_email_context c on c.job_id=l.id join auth.users u on u.id=c.recipient_id;
end;$$;
create or replace function public.agenda_email_recipient_eligible(job uuid,token uuid,expected_email text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from agenda_email_jobs j join agenda_email_context c on c.job_id=j.id join agenda_email_preferences p on p.user_id=c.recipient_id
 join auth.users u on u.id=c.recipient_id where j.id=job and j.lease_token=token and j.status='processing' and p.enabled and (not c.is_self or p.self_confirmations)
 and u.email_confirmed_at is not null and lower(u.email)=lower($3)
 and exists(select 1 from workspace_members m where m.workspace_id=c.workspace_id and m.user_id=c.recipient_id)
 and exists(select 1 from workspace_members m where m.workspace_id=c.workspace_id and m.user_id=c.actor_id));
$$;
revoke all on function public.set_agenda_self_confirmation(boolean),public.queue_own_agenda_confirmation() from public,anon,authenticated;
grant execute on function public.set_agenda_self_confirmation(boolean) to authenticated;
-- CREATE OR REPLACE preserves existing service-only grants on the worker functions.
notify pgrst, 'reload schema';
commit;
