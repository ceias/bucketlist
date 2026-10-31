-- Separate ADMIN setup, after migration 003 and deploying the agenda-email Edge Function.
-- First enable pg_cron and pg_net in Database > Extensions.
-- In Supabase Vault, create these secrets USING THE DASHBOARD (not values pasted into this file):
--   gio_supabase_project_url: your https://PROJECT_REF.supabase.co base URL
--   gio_agenda_email_worker_secret: same random secret as the Edge Function EMAIL_WORKER_SECRET
-- The cron command reads Vault at runtime; it never embeds the actual secret in cron.job.
do $$begin
 if not exists(select 1 from pg_extension where extname='pg_cron') or not exists(select 1 from pg_extension where extname='pg_net') then
  raise exception 'Enable pg_cron and pg_net in the Supabase Extensions dashboard first';end if;
 if not exists(select 1 from vault.decrypted_secrets where name='gio_supabase_project_url') or not exists(select 1 from vault.decrypted_secrets where name='gio_agenda_email_worker_secret' and length(decrypted_secret)>=32) then
  raise exception 'Create the two named Vault secrets before scheduling delivery';end if;
 if not exists(select 1 from vault.decrypted_secrets where name='gio_supabase_project_url' and decrypted_secret ~ '^https://[a-z0-9]{20}\.supabase\.co/?$') then
  raise exception 'Use the base https://PROJECT_REF.supabase.co project URL in Vault, without /rest/v1/';end if;
 if exists(select 1 from cron.job where jobname='gio-agenda-email-minute') then
  raise exception 'The email schedule already exists. Do not create another schedule';end if;
end;$$;
select cron.schedule('gio-agenda-email-minute','* * * * *',$job$
 select net.http_post(
  url := rtrim((select decrypted_secret from vault.decrypted_secrets where name='gio_supabase_project_url'),'/')||'/functions/v1/agenda-email',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='gio_agenda_email_worker_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
 );
$job$);
