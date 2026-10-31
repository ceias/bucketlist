# Gmail agenda alerts — start in test mode

This feature sends transactional email to the address on each opted-in Supabase account. Gmail login itself does not deliver these alerts. It uses Resend, a Supabase Edge Function, a database queue and a one-minute Supabase Cron job. It does not require a local database, a separate backend, or a Gmail password.

**Current limit:** without a verified sender domain, Resend’s `onboarding@resend.dev` test sender can deliver only to the email address used for your Resend account. The worker enforces that same limit. It skips another partner’s jobs rather than redirecting their emails to the test mailbox. To email both partners later, verify a domain you control. A free `vercel.app` subdomain is not a sender domain you control.

Code/tests are prepared here, but no Edge Function, schedule, API key, or live email has been configured in your project automatically.

## 1. Update the project and apply migration 003

In your cloned `bucketlist` folder, pull the update. Your Vercel Git integration will deploy the frontend automatically.

In Supabase SQL Editor, run the entire file **once**:

`supabase/migrations/202611010003_agenda_email_delivery.sql`

The first two migrations must already be applied. Do not rerun them. Migration 003 creates preferences, a delivery queue, service-only worker functions and a heartbeat. No sender address, API key, or worker secret is stored in repository SQL.

Each account starts with email alerts off. Only the signed-in user can change their own preference. Queue tables are not accessible to browser clients; the worker derives the recipient’s currently confirmed email from Supabase Auth. It rechecks membership, consent and email before sending.

## 2. Create your Resend test key

1. Sign up at `https://resend.com` using the Gmail address you want to receive the test email.
2. Confirm that account’s email.
3. Under API Keys, create a sending API key and copy it securely.
4. Keep the key out of chat, GitHub, Vercel frontend variables and `.env.local`.

For this test, the sender will be `Gio & Me <onboarding@resend.dev>` and the only allowed destination will be your Resend account’s email.

## 3. Generate the private worker secret

Use a password manager to generate at least 32 random characters, or generate a long random value in PowerShell:

```powershell
[Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")
```

Store that value securely. It is a new private worker secret, **not** the Resend key and **not** your Supabase publishable key. Do not paste it into a repository file or chat.

## 4. Add Supabase Edge Function secrets

In Supabase’s Edge Functions / Secrets settings, add:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | The Resend sending key |
| `AGENDA_EMAIL_FROM` | `Gio & Me <onboarding@resend.dev>` |
| `APP_URL` | Your deployed HTTPS Vercel website, for example `https://your-project.vercel.app` |
| `EMAIL_WORKER_SECRET` | The random worker secret from step 3 |
| `EMAIL_DELIVERY_MODE` | `test` |
| `EMAIL_TEST_RECIPIENT` | The exact Gmail address used for your Resend account |

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the deployed Edge Function. Never copy the service-role key into Vite variables or the frontend. `APP_URL` must be the deployed website, not localhost, a LAN address, or the Supabase API URL.

## 5. Deploy the Edge Function

Open Antigravity’s terminal in the cloned project folder:

```powershell
npx supabase@latest login
npx supabase@latest functions deploy agenda-email --project-ref YOUR_PROJECT_REF --use-api --no-verify-jwt
```

Replace `YOUR_PROJECT_REF` with your Project ID from Supabase General Settings. Complete CLI login in your own browser. `--use-api` bundles on Supabase and avoids requiring local Docker.

The function deliberately uses its own private bearer secret instead of accepting public user JWTs. Every request must supply `Authorization: Bearer <EMAIL_WORKER_SECRET>`. It accepts only POST and processes existing queue jobs; callers cannot supply a recipient, subject or message. `--no-verify-jwt` alone does not bypass this check. Do not share the worker secret.

## 6. Configure Supabase Vault and the schedule

1. In Database → Extensions, enable **pg_cron** and **pg_net** if not already enabled.
2. Open Supabase Vault and create these entries through its dashboard:
   - **`gio_supabase_project_url`**: your base project URL, `https://YOUR_PROJECT_REF.supabase.co` (no `/rest/v1/`).
   - **`gio_agenda_email_worker_secret`**: the **same** random value saved as `EMAIL_WORKER_SECRET` in Edge Function secrets.
3. In SQL Editor, run `supabase/setup_email_schedule.sql` **once**.

This schedules `gio-agenda-email-minute` once a minute. It reads the URL and private secret from Vault at execution time. The actual secret is not embedded in the cron job text. If the schedule already exists, the setup script stops rather than creating duplicate schedules. Do not paste secret values into this SQL file or commit them.

Wait about a minute. The bell’s Email updates section should stop saying delivery is not connected when the worker heartbeat has run successfully. “Test mode” remains visible; it does not prove an email has reached Gmail.

## 7. Send the first real test

1. Sign in to Gio & Me OS using the Supabase account whose confirmed email is **exactly your Resend account’s email**.
2. Open the bell → **Email updates → Enable email alerts**.
3. In another browser or device, sign in as the other member of the **same workspace**.
4. Have that partner create one shared goal or import a small group of agendas.
5. Wait for the next one-minute worker run.
6. Check the recipient’s Gmail inbox, including Spam/Promotions.
7. In Supabase Table Editor, inspect `agenda_email_jobs`: success has `status = sent`, a provider message ID and a sent timestamp. Also check Resend’s delivery dashboard. Provider acceptance alone is not proof of inbox delivery.

Only **new** notifications after opting in are queued. Old agendas are not emailed retroactively. Your own changes do not email you. Private journals and notes do not produce email jobs. A bulk paste uses the notification system’s combined summary, so it does not send one email per goal. No private record bodies, agenda titles, invitation codes or credentials are included in the email.

## Retries and troubleshooting

- `pending`: waiting for a worker run. Check the schedule, function deployment and matching worker secrets.
- `processing`: a worker owns a short lease. Abandoned leases are retried after three minutes.
- `retry`: a transient network, rate-limit or provider failure. The worker retries automatically with backoff, up to five claims.
- `sent`: Resend accepted the email. Check Resend delivery status and Gmail if it has not arrived.
- `skipped` / `test_recipient_only`: the destination is not your allowed Resend test address. It was **not forwarded** to anyone else.
- `skipped` / `recipient_ineligible`: consent, membership or confirmed account email no longer matches.
- `failed` / `provider_403`: commonly an invalid sender, provider key permissions, or attempting a destination forbidden by Resend. Verify settings in Resend.
- `failed` / `expired`: stopped before the provider’s 24-hour idempotency window expires.

Each email uses the notification UUID as a stable Resend idempotency key. A lost response or database acknowledgement can therefore be retried without intentionally creating another email. Jobs stop retrying after 23 hours to stay inside Resend’s 24-hour deduplication window. Do not blindly reset old jobs or change IDs to retry them: a provider may already have accepted an earlier request.

Worker responses contain counts only, and the code does not log email addresses, private content, keys or provider response bodies. Do not share screenshots containing keys or Vault secrets. Authenticated users cannot inspect each other’s preferences or queue. Turning off email alerts skips pending jobs; a message already being transmitted may still arrive.

## Enable delivery to both partners later

1. Obtain a domain you control and verify it in Resend using the required DNS records.
2. Change `AGENDA_EMAIL_FROM` to a verified address on that domain.
3. Set `EMAIL_DELIVERY_MODE=production`. The worker rejects the test sender in production mode.
4. Each partner enables email alerts in their own account. The service-only worker then uses each person’s confirmed Supabase email.
5. Test with both accounts before relying on delivery. Review your provider’s current quotas and delivery restrictions.

This is independent of Supabase’s authentication email/SMTP settings. Changing auth email templates or configuring Google sign-in does not enable agenda emails.
