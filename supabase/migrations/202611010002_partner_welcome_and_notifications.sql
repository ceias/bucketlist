-- Run ONCE in Supabase Cloud SQL Editor after 202610310001_initial_workspace.sql.
-- This adds invitations/welcome text and durable, recipient-only shared-agenda notifications.
begin;
alter table public.workspace_invitations add column partner_name text not null default 'Gio' check(length(partner_name) between 1 and 80);
alter table public.workspace_invitations add column welcome_title text not null default 'Welcome home, my baby! ♡' check(length(welcome_title) between 1 and 160);
alter table public.workspace_invitations add column welcome_message text not null default $welcome$Hi, my love! Welcome to our little world, a space just for you and me. Here, we'll collect our memories, plan our adventures, and cherish every little moment together.

No matter where life takes us, I hope this space always reminds you that you have a home in me.

I love you, Gio. Always and in all ways. ♡$welcome$ check(length(welcome_message) between 1 and 2000);

create function public.create_partner_invitation(target_workspace uuid, partner_name text, welcome_title text, welcome_message text)
returns text language plpgsql security definer set search_path=public as $$
declare code text;
begin
 if auth.uid() is null or not public.is_workspace_member(target_workspace) then raise exception 'Workspace access denied';end if;
 if length(trim(partner_name)) not between 1 and 80 or length(trim(welcome_title)) not between 1 and 160 or length(trim(welcome_message)) not between 1 and 2000 then raise exception 'Check your partner name and welcome message';end if;
 code:=public.create_invitation(target_workspace);
 update public.workspace_invitations i set partner_name=trim(create_partner_invitation.partner_name),welcome_title=trim(create_partner_invitation.welcome_title),welcome_message=trim(create_partner_invitation.welcome_message)
 where i.code_hash=encode(extensions.digest(code,'sha256'),'hex');
 return code;
end;$$;

-- A valid, high-entropy invitation is required. No email addresses or membership IDs are exposed.
create function public.preview_partner_invitation(invitation_code text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare invite public.workspace_invitations; inviter text; space_name text;
begin
 if invitation_code !~ '^[a-f0-9]{48}$' then raise exception 'This invitation link is invalid';end if;
 select * into invite from public.workspace_invitations where code_hash=encode(extensions.digest(invitation_code,'sha256'),'hex') and used_at is null and expires_at>now();
 if invite.id is null then raise exception 'This invitation has expired or was already accepted. Ask your partner for a new link.';end if;
 if (select count(*) from public.workspace_members where workspace_id=invite.workspace_id)>=2 then raise exception 'This little world already has two partners';end if;
 select name into space_name from public.couple_workspaces where id=invite.workspace_id;
 select left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Your partner'),80) into inviter from auth.users where id=invite.created_by;
 return jsonb_build_object('inviter_name',inviter,'workspace_name',space_name,'partner_name',invite.partner_name,'welcome_title',invite.welcome_title,'welcome_message',invite.welcome_message,'expires_at',invite.expires_at);
end;$$;

create function public.accept_partner_invitation(invitation_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare invite public.workspace_invitations; space_id uuid; metadata jsonb;
begin
 if auth.uid() is null then raise exception 'Please sign in to accept this invitation';end if;
 -- The existing function enforces expiry, single use and the two-member limit under a workspace lock.
 select * into invite from public.workspace_invitations where code_hash=encode(extensions.digest(invitation_code,'sha256'),'hex');
 space_id:=public.accept_invitation(invitation_code);
 update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object(
   'display_name',coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),invite.partner_name),
   'welcome_title',invite.welcome_title,'welcome_message',invite.welcome_message)
 where id=auth.uid() returning raw_user_meta_data into metadata;
 return jsonb_build_object('workspace_id',space_id,'metadata',metadata);
end;$$;
revoke all on function public.create_partner_invitation(uuid,text,text,text),public.preview_partner_invitation(text),public.accept_partner_invitation(text) from public,anon,authenticated;
grant execute on function public.preview_partner_invitation(text) to anon,authenticated;
grant execute on function public.create_partner_invitation(uuid,text,text,text),public.accept_partner_invitation(text) to authenticated;

create table public.notifications (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade, actor_id uuid not null references auth.users(id) on delete cascade,
 actor_name text not null, title text not null, message text not null,
 app_kind text not null check(app_kind in ('bucket','calendar','dates')), record_id uuid references public.records(id) on delete set null,
 item_count integer not null default 1 check(item_count>0), created_at timestamptz not null default now(), read_at timestamptz,
 check(recipient_id<>actor_id)
);
create index notifications_recipient_created on public.notifications(recipient_id,created_at desc);
alter table public.notifications enable row level security;
create policy notification_read on public.notifications for select to authenticated using(recipient_id=auth.uid() and public.is_workspace_member(workspace_id));
create policy notification_mark_read on public.notifications for update to authenticated using(recipient_id=auth.uid() and public.is_workspace_member(workspace_id)) with check(recipient_id=auth.uid() and public.is_workspace_member(workspace_id));
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

create function public.notify_partner_of_agendas() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); actor_label text; batch record;
begin
 if actor is null then return null;end if;
 select left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Your partner'),80) into actor_label from auth.users where id=actor;
 for batch in select r.workspace_id,r.kind,count(*)::integer as total,min(r.id::text)::uuid as first_id
   from added_agendas r where r.kind in ('bucket','calendar','dates') and not r.private and not r.deleted
   group by r.workspace_id,r.kind
 loop
   insert into public.notifications(workspace_id,recipient_id,actor_id,actor_name,title,message,app_kind,record_id,item_count)
   select batch.workspace_id,m.user_id,actor,actor_label,
     actor_label||case when batch.total=1 then ' added a new agenda' else ' added '||batch.total||' new agendas' end,
     case when batch.total=1 then (select title from public.records where id=batch.first_id) else 'A little more to look forward to, together.' end,
     batch.kind,batch.first_id,batch.total
   from public.workspace_members m where m.workspace_id=batch.workspace_id and m.user_id<>actor
     and public.is_workspace_member(batch.workspace_id);
 end loop;
 return null;
end;$$;
-- Statement-level: a bulk paste sends one summary per app to the other partner, not one alert per row.
-- Retried UPSERTs of existing IDs only update rows, so they do not resend insert notifications.
create trigger notify_partner_agenda_insert after insert on public.records referencing new table as added_agendas
 for each statement execute function public.notify_partner_of_agendas();
revoke all on function public.notify_partner_of_agendas() from public,anon,authenticated;

do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then alter publication supabase_realtime add table public.notifications;end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='records') then alter publication supabase_realtime add table public.records;end if;
 end if;
end;$$;
commit;
