-- Run as the project administrator in Supabase SQL Editor.
-- Replace ONLY the two email values below. Both accounts must have solo workspaces.
-- Keep both partners signed out until this transaction finishes.
begin;
-- Prevent concurrent joins, writes and uploads while the checked merge is applied.
lock table public.couple_workspaces, public.workspace_members, public.workspace_invitations,
 public.records, public.notifications, public.agenda_email_jobs, storage.objects in exclusive mode;

-- Private, administrator-managed links keep existing Storage object paths valid.
-- Never rename Storage objects by updating storage.objects directly.
create table if not exists public.workspace_storage_aliases (
 source_workspace_id uuid primary key references public.couple_workspaces(id),
 target_workspace_id uuid not null references public.couple_workspaces(id),
 created_at timestamptz not null default now(),
 check(source_workspace_id<>target_workspace_id)
);
alter table public.workspace_storage_aliases enable row level security;
revoke all on public.workspace_storage_aliases from public,anon,authenticated;
create or replace function public.can_access_merged_memory(source_folder text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.workspace_storage_aliases a
 where a.source_workspace_id::text=source_folder and public.is_workspace_member(a.target_workspace_id));
$$;
revoke all on function public.can_access_merged_memory(text) from public,anon;
grant execute on function public.can_access_merged_memory(text) to authenticated;
-- These extend access only to the old folder of an explicitly merged workspace.
drop policy if exists merged_memory_read on storage.objects;
create policy merged_memory_read on storage.objects for select to authenticated using(
 bucket_id='memories' and public.can_access_merged_memory((storage.foldername(name))[1]));
drop policy if exists merged_memory_delete on storage.objects;
create policy merged_memory_delete on storage.objects for delete to authenticated using(
 bucket_id='memories' and public.can_access_merged_memory((storage.foldername(name))[1])
 and (storage.foldername(name))[2]=auth.uid()::text);

do $merge$
declare
 keep_email text := 'YOUR_WEBSITE_EMAIL_HERE';
 move_email text := 'GIOS_WEBSITE_EMAIL_HERE';
 keep_user uuid; move_user uuid; keep_space uuid; move_space uuid; moved_count integer;
begin
 if keep_email like '%_HERE' or move_email like '%_HERE' then raise exception 'Replace both email placeholders before running';end if;
 select id into strict keep_user from auth.users where lower(email)=lower(trim(keep_email)) and email_confirmed_at is not null;
 select id into strict move_user from auth.users where lower(email)=lower(trim(move_email)) and email_confirmed_at is not null;
 if keep_user=move_user then raise exception 'Choose two different accounts';end if;
 select workspace_id into strict keep_space from public.workspace_members where user_id=keep_user;
 select workspace_id into strict move_space from public.workspace_members where user_id=move_user;
 if keep_space=move_space then raise exception 'Already paired. No merge is needed';end if;
 if (select count(*) from public.workspace_members where workspace_id=keep_space)<>1
 or (select count(*) from public.workspace_members where workspace_id=move_space)<>1 then
 raise exception 'Both workspaces must contain exactly one member. Nothing was moved';end if;
 if exists(select 1 from public.records where workspace_id=move_space and owner_id<>move_user)
 or exists(select 1 from public.records where workspace_id=keep_space and owner_id<>keep_user) then
 raise exception 'Unexpected record owners: review the workspaces before merging';end if;
 if exists(select 1 from public.workspace_storage_aliases where source_workspace_id in (keep_space,move_space) or target_workspace_id=move_space) then
 raise exception 'An earlier merge involves these workspaces; review it first';end if;
 if exists(select 1 from storage.objects where bucket_id='memories'
 and (storage.foldername(name))[1]=move_space::text
 and ((storage.foldername(name))[2] is distinct from move_user::text)) then
 raise exception 'Unexpected photo ownership in the source folder';end if;
 if exists(select 1 from public.records r where r.workspace_id=move_space and r.kind='gallery' and (
 nullif(r.data->>'path','') is null or
 split_part(r.data->>'path','/',1)<>move_space::text or
 split_part(r.data->>'path','/',2)<>move_user::text or
 not exists(select 1 from storage.objects o where o.bucket_id='memories' and o.name=r.data->>'path'))) then
 raise exception 'A source photo is missing or has an unexpected path. Repair it before merging';end if;

 -- New Together content needs a dedicated migration, never silently leave it behind.
 if to_regclass('public.couple_entries') is not null then
  lock table public.couple_entries,public.couple_actions,public.couple_activity,public.couple_inbox,public.couple_reminders in exclusive mode;
  if exists(select 1 from public.couple_entries where workspace_id=move_space)
  or exists(select 1 from public.couple_actions where workspace_id=move_space)
  or exists(select 1 from public.couple_activity where workspace_id=move_space)
  or exists(select 1 from public.couple_inbox where workspace_id=move_space)
  or exists(select 1 from public.couple_reminders where workspace_id=move_space) then
   raise exception 'The source already has Together content; prepare a dedicated merge instead of leaving it behind';end if;
 end if;
 insert into public.workspace_storage_aliases(source_workspace_id,target_workspace_id) values(move_space,keep_space);
 -- This one existing ownership guard blocks workspace changes even for administrators.
 -- Disable it only inside this locked transaction; ownership/privacy/IDs stay unchanged.
 alter table public.records disable trigger records_update;
 update public.records set workspace_id=keep_space where workspace_id=move_space;
 get diagnostics moved_count = row_count;
 alter table public.records enable trigger records_update;
 -- Preserve notification history without sending old agendas again during the merge.
 update public.agenda_email_jobs j set status='skipped',error_code='workspace_merged'
 where j.status in ('pending','retry','processing') and (
 j.self_workspace_id=move_space or exists(select 1 from public.notifications n where n.id=j.notification_id and n.workspace_id=move_space));
 update public.notifications set workspace_id=keep_space where workspace_id=move_space;
 update public.agenda_email_jobs set self_workspace_id=keep_space where self_workspace_id=move_space;
 update public.workspace_members set workspace_id=keep_space where user_id=move_user and workspace_id=move_space;
 update public.workspace_invitations set used_at=now() where workspace_id in (keep_space,move_space) and used_at is null;
 -- Retain the empty old workspace and its Storage folder; do not delete either.
 raise notice 'Merged % records. Both accounts now share workspace %. Photo paths and private flags were preserved.',moved_count,keep_space;
end;
$merge$;
notify pgrst, 'reload schema';
commit;
