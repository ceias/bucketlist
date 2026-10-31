-- Run ONCE after the first two migrations. No email address or API key belongs in this file.
begin;
create table public.agenda_email_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.agenda_email_preferences enable row level security;
revoke all on public.agenda_email_preferences from public,anon,authenticated;
create table public.agenda_email_worker_state (
 singleton boolean primary key default true check(singleton), last_seen_at timestamptz, test_mode boolean not null default true
);
insert into public.agenda_email_worker_state(singleton) values(true);
alter table public.agenda_email_worker_state enable row level security;
revoke all on public.agenda_email_worker_state from public,anon,authenticated;
create table public.agenda_email_jobs (
 id uuid primary key default gen_random_uuid(), notification_id uuid not null unique references public.notifications(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','processing','retry','sent','skipped','failed')),
 attempts integer not null default 0 check(attempts>=0), next_attempt_at timestamptz not null default now(),
 lease_token uuid, locked_at timestamptz, created_at timestamptz not null default now(),
 sent_at timestamptz, provider_message_id text, error_code text
);
create index agenda_email_jobs_pending on public.agenda_email_jobs(status,next_attempt_at);
alter table public.agenda_email_jobs enable row level security;
revoke all on public.agenda_email_jobs from public,anon,authenticated;

create function public.get_agenda_email_preference() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 return jsonb_build_object('enabled',coalesce((select enabled from agenda_email_preferences where user_id=auth.uid()),false),
 'delivery_ready',coalesce((select last_seen_at>now()-interval '10 minutes' from agenda_email_worker_state where singleton),false),'test_mode',coalesce((select test_mode from agenda_email_worker_state where singleton),true));
end;$$;
create function public.set_agenda_email_preference(email_enabled boolean) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if email_enabled is null then raise exception 'Choose an email preference';end if;
 if email_enabled and not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and nullif(email,'') is not null) then raise exception 'Confirm your account email before enabling agenda emails';end if;
 insert into agenda_email_preferences(user_id,enabled) values(auth.uid(),email_enabled)
 on conflict(user_id) do update set enabled=excluded.enabled,updated_at=now();
 -- Opting out discards unsent jobs. Re-enabling does not backfill old notifications.
 if not email_enabled then update agenda_email_jobs j set status='skipped',error_code='opted_out'
 from notifications n where j.notification_id=n.id and n.recipient_id=auth.uid() and j.status in ('pending','retry');end if;
 return public.get_agenda_email_preference();
end;$$;
create function public.enqueue_agenda_email() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from agenda_email_preferences where user_id=new.recipient_id and enabled) then
 insert into agenda_email_jobs(notification_id) values(new.id) on conflict(notification_id) do nothing;
 end if;
 return new;
end;$$;
create trigger queue_partner_agenda_email after insert on public.notifications for each row execute function public.enqueue_agenda_email();

-- Service-only worker: it derives the recipient from verified Supabase Auth, never from an HTTP body.
create function public.claim_agenda_emails(batch_size integer default 5,test_mode boolean default true)
returns table(job_id uuid,token uuid,notice_id uuid,recipient_email text,recipient_name text,actor_name text,item_count integer,app_kind text)
language plpgsql security definer set search_path=public as $$
begin
 update agenda_email_worker_state set last_seen_at=now(),test_mode=claim_agenda_emails.test_mode where singleton;
 -- Resend deduplicates for 24h. Stop before that window expires rather than risking a duplicate send.
 update agenda_email_jobs set status='failed',error_code='expired' where status in ('pending','retry','processing') and created_at<now()-interval '23 hours';
 update agenda_email_jobs set status=case when attempts>=5 then 'failed' else 'retry' end,lease_token=null,locked_at=null,next_attempt_at=now(),error_code='lease_expired'
 where status='processing' and locked_at<now()-interval '3 minutes';
 update agenda_email_jobs j set status='skipped',error_code='recipient_ineligible'
 from notifications n where j.notification_id=n.id and j.status in ('pending','retry') and (
 not exists(select 1 from agenda_email_preferences p where p.user_id=n.recipient_id and p.enabled) or
 not exists(select 1 from auth.users u where u.id=n.recipient_id and u.email_confirmed_at is not null and nullif(u.email,'') is not null) or
 not exists(select 1 from workspace_members m where m.workspace_id=n.workspace_id and m.user_id=n.recipient_id) or
 not exists(select 1 from workspace_members m where m.workspace_id=n.workspace_id and m.user_id=n.actor_id));
 return query with candidates as (
 select j.id from agenda_email_jobs j where j.status in ('pending','retry') and j.next_attempt_at<=now() and j.attempts<5
 order by j.created_at for update skip locked limit greatest(1,least(coalesce(batch_size,5),5))
 ), leased as (
 update agenda_email_jobs j set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),locked_at=now()
 from candidates c where j.id=c.id returning j.id,j.lease_token,j.notification_id
 )
 select l.id,l.lease_token,n.id,u.email::text,
 left(coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'),''),'my love'),80),n.actor_name,n.item_count,n.app_kind
 from leased l join notifications n on n.id=l.notification_id join auth.users u on u.id=n.recipient_id;
end;$$;

create function public.finish_agenda_email(job uuid,token uuid,outcome text,provider_id text default null,failure_code text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if outcome not in ('sent','retry','skipped','failed') then raise exception 'Invalid delivery outcome';end if;
 update agenda_email_jobs j set status=case when outcome='retry' and j.attempts>=5 then 'failed' else outcome end,
 sent_at=case when outcome='sent' then now() else j.sent_at end,provider_message_id=left(provider_id,200),error_code=left(failure_code,80),
 next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,greatest(j.attempts-1,0)))::integer),lease_token=null,locked_at=null
 where j.id=job and j.lease_token=token and j.status='processing';
end;$$;
create function public.agenda_email_recipient_eligible(job uuid,token uuid,expected_email text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from agenda_email_jobs j join notifications n on n.id=j.notification_id join agenda_email_preferences p on p.user_id=n.recipient_id
 join auth.users u on u.id=n.recipient_id where j.id=job and j.lease_token=token and j.status='processing' and p.enabled and u.email_confirmed_at is not null and lower(u.email)=lower($3)
 and exists(select 1 from workspace_members m where m.workspace_id=n.workspace_id and m.user_id=n.recipient_id)
 and exists(select 1 from workspace_members m where m.workspace_id=n.workspace_id and m.user_id=n.actor_id));
$$;
revoke all on function public.get_agenda_email_preference(),public.set_agenda_email_preference(boolean),public.enqueue_agenda_email(),public.claim_agenda_emails(integer,boolean),public.finish_agenda_email(uuid,uuid,text,text,text),public.agenda_email_recipient_eligible(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.get_agenda_email_preference(),public.set_agenda_email_preference(boolean) to authenticated;
grant execute on function public.claim_agenda_emails(integer,boolean),public.finish_agenda_email(uuid,uuid,text,text,text),public.agenda_email_recipient_eligible(uuid,uuid,text) to service_role;
notify pgrst, 'reload schema';
-- Scheduling the worker is separate: see docs/email-setup.md. Do not put secrets in repository SQL.
commit;
