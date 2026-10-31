-- ADMIN: after migration 005 and deploying couple-reminders. Reuses existing Vault values.
begin;
do $$begin
 if not exists(select 1 from pg_extension where extname='pg_cron') or not exists(select 1 from pg_extension where extname='pg_net') then raise exception 'Enable pg_cron and pg_net first';end if;
 if exists(select 1 from cron.job where jobname='gio-couple-reminders-minute') then raise exception 'The reminder schedule already exists; do not add another';end if;
 if not exists(select 1 from vault.decrypted_secrets where name='gio_supabase_project_url' and decrypted_secret ~ '^https://[a-z0-9]{20}\.supabase\.co/?$') or not exists(select 1 from vault.decrypted_secrets where name='gio_agenda_email_worker_secret' and length(decrypted_secret)>=32) then raise exception 'Keep the existing valid project URL and worker secret in Vault';end if;
end;$$;
create or replace function public.run_couple_reminder_tick() returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.dispatch_couple_reminders();
 perform net.http_post(
 url:=rtrim((select decrypted_secret from vault.decrypted_secrets where name='gio_supabase_project_url'),'/')||'/functions/v1/couple-reminders',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='gio_agenda_email_worker_secret')),
 body:='{}'::jsonb,timeout_milliseconds:=120000);
end;$$;
revoke all on function public.run_couple_reminder_tick() from public,anon,authenticated;
select cron.schedule('gio-couple-reminders-minute','* * * * *','select public.run_couple_reminder_tick()');
commit;
