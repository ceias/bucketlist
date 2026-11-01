-- Run once after migration 005. Activity sharing starts OFF for both accounts.
begin;
create table public.partner_visit_preferences (
 workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 enabled boolean not null default false,sharing_since timestamptz,last_visit_at timestamptz,primary key(workspace_id,user_id)
);
alter table public.partner_visit_preferences enable row level security;
create table public.partner_visit_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.couple_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('visit','sign_in')),
 occurred_at timestamptz not null default now(),unique(user_id,kind,occurred_at)
);
create index partner_visit_events_recent on public.partner_visit_events(workspace_id,user_id,occurred_at desc);
alter table public.partner_visit_events enable row level security;
revoke all on public.partner_visit_preferences,public.partner_visit_events from public,anon,authenticated;

create function public.record_my_website_visit() returns void language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid(); space uuid; pref public.partner_visit_preferences; sign_in timestamptz;
begin
 if viewer is null then raise exception 'Sign in first';end if;
 perform pg_advisory_xact_lock(hashtextextended(viewer::text,41));
 select workspace_id into space from workspace_members where user_id=viewer;
 if space is null then return;end if;
 select * into pref from partner_visit_preferences where user_id=viewer and workspace_id=space;
 if pref.enabled is distinct from true then return;end if;
 -- No heartbeat or online inference: this records an actual visible app entry/return.
 update partner_visit_preferences set last_visit_at=now() where user_id=viewer and workspace_id=space;
 if not exists(select 1 from partner_visit_events where user_id=viewer and workspace_id=space and kind='visit' and occurred_at>now()-interval '15 minutes') then
  insert into partner_visit_events(workspace_id,user_id,kind) values(space,viewer,'visit');
 end if;
 -- Supabase Auth supplies the real sign-in time. Client-supplied timestamps are never accepted.
 select last_sign_in_at into sign_in from auth.users where id=viewer;
 if sign_in is not null and sign_in>=pref.sharing_since and sign_in<=now() then
  insert into partner_visit_events(workspace_id,user_id,kind,occurred_at) values(space,viewer,'sign_in',sign_in) on conflict do nothing;
 end if;
 delete from partner_visit_events where user_id=viewer and occurred_at<now()-interval '30 days';
end;$$;
create function public.set_my_visit_sharing(sharing_enabled boolean) returns void language plpgsql security definer set search_path=public as $$
declare viewer uuid:=auth.uid();previous boolean;space uuid;
begin
 if viewer is null or sharing_enabled is null then raise exception 'Sign in and choose a sharing preference';end if;
 select workspace_id into space from workspace_members where user_id=viewer;
 if space is null then raise exception 'Join a workspace first';end if;
 perform pg_advisory_xact_lock(hashtextextended(viewer::text,41));
 select enabled into previous from partner_visit_preferences where user_id=viewer and workspace_id=space;
 insert into partner_visit_preferences(workspace_id,user_id,enabled,sharing_since,last_visit_at)
 values(space,viewer,sharing_enabled,case when sharing_enabled then now() else null end,null)
 on conflict(workspace_id,user_id) do update set enabled=excluded.enabled,
 sharing_since=case when sharing_enabled and coalesce(previous,false) then partner_visit_preferences.sharing_since else excluded.sharing_since end,
 last_visit_at=case when sharing_enabled then partner_visit_preferences.last_visit_at else null end;
 if not sharing_enabled then delete from partner_visit_events where user_id=viewer and workspace_id=space;
 else perform public.record_my_website_visit();end if;
end;$$;
create function public.get_shared_visit_activity() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare viewer uuid:=auth.uid();space uuid;
begin
 if viewer is null then raise exception 'Sign in first';end if;
 select workspace_id into space from workspace_members where user_id=viewer;
 if space is null then raise exception 'Join a workspace first';end if;
 return jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object(
 'user_id',m.user_id,'display_name',left(coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'),''),'Your partner'),80),
 'is_you',m.user_id=viewer,'sharing',coalesce(p.enabled,false),
 'last_visit_at',case when p.enabled then p.last_visit_at else null end,
 'last_sign_in_at',case when p.enabled and u.last_sign_in_at>=p.sharing_since then u.last_sign_in_at else null end,
 'events',case when p.enabled then coalesce((select jsonb_agg(t) from (select e.id,e.kind,e.occurred_at from partner_visit_events e where e.workspace_id=space and e.user_id=m.user_id and e.occurred_at>=p.sharing_since and e.occurred_at>now()-interval '30 days' order by e.occurred_at desc limit 20) t),'[]') else '[]'::jsonb end
 )) from workspace_members m join auth.users u on u.id=m.user_id left join partner_visit_preferences p on p.user_id=m.user_id and p.workspace_id=space where m.workspace_id=space),'[]'));
end;$$;
revoke all on function public.record_my_website_visit(),public.set_my_visit_sharing(boolean),public.get_shared_visit_activity() from public,anon,authenticated;
grant execute on function public.record_my_website_visit(),public.set_my_visit_sharing(boolean),public.get_shared_visit_activity() to authenticated;
notify pgrst,'reload schema';
commit;
