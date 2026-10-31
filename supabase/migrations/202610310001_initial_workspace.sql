-- Initial foundation schema. Apply in Supabase Cloud SQL Editor, as the project administrator.
-- Flexible records support this first implementation; specialized normalized models are future work.
create extension if not exists pgcrypto with schema extensions;
create table public.couple_workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), seeded_at timestamptz
);
create table public.workspace_members (
 workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
create table public.workspace_invitations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 code_hash text not null unique, created_by uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '48 hours', used_at timestamptz
);
create table public.records (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 owner_id uuid not null references auth.users(id),
 kind text not null check(kind in ('calendar','bucket','dates','journal','finances','gallery','outfits','anniversary','notes','wishlist')),
 title text not null check(length(trim(title)) between 1 and 200), body text not null default '',
 date date, category text not null default '', amount numeric(14,2) not null default 0 check(amount>=0),
 done boolean not null default false, private boolean not null default false,
 data jsonb not null default '{}', deleted boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not private or kind in ('journal','notes','anniversary'))
);
create index records_workspace_kind_date on public.records(workspace_id,kind,date);
create index records_owner on public.records(owner_id);
create index invitations_workspace on public.workspace_invitations(workspace_id);
create function public.is_workspace_member(target uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.workspace_members where workspace_id=target and user_id=auth.uid());
$$;
create function public.guard_record_update() returns trigger language plpgsql set search_path=public as $$
begin
 if new.workspace_id<>old.workspace_id or new.owner_id<>old.owner_id or new.id<>old.id then raise exception 'Record ownership is immutable'; end if;
 if new.private is distinct from old.private and old.owner_id<>auth.uid() then raise exception 'Only the owner can change privacy'; end if;
 new.created_at:=old.created_at;new.updated_at:=now();return new;
end;$$;
create trigger records_update before update on public.records for each row execute function public.guard_record_update();
alter table public.couple_workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.records enable row level security;
create policy workspace_read on public.couple_workspaces for select to authenticated using(public.is_workspace_member(id));
create policy members_read on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
-- Invitations are available exclusively through the functions below. No direct read/write policies.
create policy records_read on public.records for select to authenticated using(public.is_workspace_member(workspace_id) and (not private or owner_id=auth.uid()));
create policy records_insert on public.records for insert to authenticated with check(public.is_workspace_member(workspace_id) and owner_id=auth.uid());
create policy records_update on public.records for update to authenticated using(public.is_workspace_member(workspace_id) and (not private or owner_id=auth.uid())) with check(public.is_workspace_member(workspace_id) and (not private or owner_id=auth.uid()));
create policy records_delete on public.records for delete to authenticated using(public.is_workspace_member(workspace_id) and (not private or owner_id=auth.uid()));
create function public.create_workspace(workspace_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 -- Serializes concurrent workspace creation / pairing for the same user.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from workspace_members where user_id=auth.uid()) then raise exception 'You already have a workspace';end if;
 insert into couple_workspaces(name,created_by) values(workspace_name,auth.uid()) returning id into result;
 insert into workspace_members(workspace_id,user_id) values(result,auth.uid());return result;
end;$$;
create function public.create_invitation(target_workspace uuid) returns text language plpgsql security definer set search_path=public as $$
declare code text;
begin
 if not public.is_workspace_member(target_workspace) then raise exception 'Workspace access denied';end if;
 perform 1 from couple_workspaces where id=target_workspace for update;
 if (select count(*) from workspace_members where workspace_id=target_workspace)>=2 then raise exception 'This workspace already has two partners';end if;
 code:=encode(extensions.gen_random_bytes(24),'hex');
 update workspace_invitations set used_at=now() where workspace_id=target_workspace and used_at is null;
 insert into workspace_invitations(workspace_id,code_hash,created_by) values(target_workspace,encode(extensions.digest(code,'sha256'),'hex'),auth.uid());
 return code;
end;$$;
create function public.accept_invitation(invitation_code text) returns uuid language plpgsql security definer set search_path=public as $$
declare invitation public.workspace_invitations;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from workspace_members where user_id=auth.uid()) then raise exception 'You already have a workspace';end if;
 select * into invitation from workspace_invitations where code_hash=encode(extensions.digest(invitation_code,'sha256'),'hex');
 if invitation.id is null then raise exception 'Invalid or expired invitation';end if;
 perform 1 from couple_workspaces where id=invitation.workspace_id for update;
 -- Re-read after the workspace lock to prevent two simultaneous uses.
 select * into invitation from workspace_invitations where id=invitation.id for update;
 if invitation.used_at is not null or invitation.expires_at<=now() then raise exception 'Invalid or expired invitation';end if;
 if (select count(*) from workspace_members where workspace_id=invitation.workspace_id)>=2 then raise exception 'This workspace already has two partners';end if;
 insert into workspace_members(workspace_id,user_id) values(invitation.workspace_id,auth.uid());
 update workspace_invitations set used_at=now() where id=invitation.id;
 return invitation.workspace_id;
end;$$;
create function public.seed_missions(target_workspace uuid,seeds jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_workspace_member(target_workspace) then raise exception 'Workspace access denied';end if;
 perform 1 from couple_workspaces where id=target_workspace for update;
 if (select seeded_at from couple_workspaces where id=target_workspace) is not null then return;end if;
 if jsonb_typeof(seeds)<>'array' or jsonb_array_length(seeds)>100 then raise exception 'Invalid starter plan';end if;
 insert into records(workspace_id,owner_id,kind,title,body,date,category)
 select target_workspace,auth.uid(),'bucket',s->>'title',coalesce(s->>'body',''),(s->>'date')::date,'Monthly goals' from jsonb_array_elements(seeds) s;
 update couple_workspaces set seeded_at=now() where id=target_workspace;
end;$$;
-- Remove default broad function access; only signed-in clients may call these APIs.
revoke all on function public.is_workspace_member(uuid),public.create_workspace(text),public.create_invitation(uuid),public.accept_invitation(text),public.seed_missions(uuid,jsonb) from public,anon;
grant execute on function public.is_workspace_member(uuid),public.create_workspace(text),public.create_invitation(uuid),public.accept_invitation(text),public.seed_missions(uuid,jsonb) to authenticated;
revoke all on public.couple_workspaces,public.workspace_members,public.workspace_invitations,public.records from anon,authenticated;
grant select on public.couple_workspaces,public.workspace_members to authenticated;
grant select,insert,update,delete on public.records to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('memories','memories',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy memory_read on storage.objects for select to authenticated using(bucket_id='memories' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));
create policy memory_upload on storage.objects for insert to authenticated with check(bucket_id='memories' and public.is_workspace_member(((storage.foldername(name))[1])::uuid) and (storage.foldername(name))[2]=auth.uid()::text);
create policy memory_delete on storage.objects for delete to authenticated using(bucket_id='memories' and public.is_workspace_member(((storage.foldername(name))[1])::uuid) and (storage.foldername(name))[2]=auth.uid()::text);
-- Photos are shared within the workspace. Journals/letters are text-only in this initial version.
