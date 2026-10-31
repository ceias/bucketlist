# Together Space: release and setup

This release implements all 25 approved ideas (1–17 and 19–26). Home-screen installation (18) is excluded. Layouts adapt to phone browsers; no app installation is required. iPhone/Samsung hardware and live Supabase/Resend delivery still need verification on your devices.

## Activate on your existing Supabase project

Your workspaces are already merged. **Do not rerun the merge script, original migrations, or existing agenda-email schedule.**

1. Open [`202611010005_together_space.sql`](https://github.com/ceias/bucketlist/blob/main/supabase/migrations/202611010005_together_space.sql), choose **Raw**, and copy everything. Paste into a new Supabase SQL Editor query and run once. Requires migrations 001–004 already applied. The transaction adds new tables/functions/policies; it does not change existing membership, photo files, storage aliases or the original record policies.
2. Wait for Vercel's new frontend deployment to become Ready. Refresh the website. Open **Together** from the side dock or Home. Both partners can use the shared features immediately after the migration.
3. For scheduled reminders, update your local repository and deploy the new function from its root:

   ```powershell
   git pull origin main
   npm install
   npx supabase login
   npx supabase functions deploy couple-reminders --project-ref vgggjildzrcrkpapgaxr --use-api --no-verify-jwt
   ```

   This function uses the **same six Edge Function secrets** and **same two Vault secrets** as the existing agenda-email function. No new API key is needed. It requires the private `EMAIL_WORKER_SECRET` bearer token despite `--no-verify-jwt`. Never put credentials in the frontend or repository.
4. Open [`setup_together_reminders.sql`](https://github.com/ceias/bucketlist/blob/main/supabase/setup_together_reminders.sql), copy the full script to a new SQL Editor query, and run once. It creates the separate `gio-couple-reminders-minute` schedule. Keep `gio-agenda-email-minute` unchanged. Both use the existing private Vault values. If it says the reminder schedule already exists, do not duplicate it.
5. Each person opens an existing dated goal/calendar event/date plan, enables **my agenda reminders**, chooses the reminder time in their own device timezone, and schedules it. Inbox delivery works while the website is closed once the minute schedule is active. To also receive an email, separately enable Email alerts in the bell and check the reminder's email checkbox. Month-only goals need a specific day first. Check **Settings → Our connection** for the reminder worker's recent heartbeat.

**Resend test mode still only sends to the configured Resend account email.** Your partner will receive in-app updates but cannot receive email at a different address until a verified sender domain and production mode are configured. This release does not bypass that provider restriction. Hearts are in-app notifications, not emails or closed-site phone push.

## Where each approved feature lives

| # | Feature | Where / behavior |
|---|---|---|
| 1 | Creator labels | Gallery, shared collections, journal and agenda editor show the original author; creation date when available. |
| 2 | Photo hearts and comments | Gallery → Details. Reactions are separate from the existing album favorite control. |
| 3 | Shared activity feed | Together → Love, lately. Server logs new shared additions/edits; private records are excluded. Existing activity is not backfilled. |
| 4 | Next-date countdown | Home → Our next adventure. Counts calendar days to the next unfinished date/event. |
| 5 | Personal agenda reminders | Open an agenda → enable your reminders → choose a time. In-app inbox plus optional email through the new scheduled worker. |
| 6 | Memory timeline | Together → Timeline & recap. Shared photos, journal pages and completed goals grouped by their record month. |
| 7 | Timed surprise notes | Together → Surprises → Surprise letter. Only the author can read it before opening time. |
| 8 | Workspace connection status | Settings → Our connection. Names, member count, workspace ID and reminder worker status. |
| 9 | Plan together | Together → Plan together, or responses on an existing agenda. “I'm in”, “Maybe” and alternative-date proposals. |
| 10 | Shared assigned checklists | Together → Checklists. One task per line; optionally `Task | partner display name`. Either partner can complete a task. |
| 11 | Our places map | Together → Our places. Latitude/longitude pins, visited/wishlist state, notes and an attached shared photo. Tiles open from OpenStreetMap on request. |
| 12 | Monthly recap | Together → Timeline & recap. Select month to see photo, journal and completed-goal counts. These use each record's date, not an inferred completion timestamp. |
| 13 | Mood check-ins | Together → Check in. Share a mood and whether you need comfort, company, quiet or encouragement. |
| 14 | Date idea jar | Together → Date idea jar. Draw an eligible idea by maximum budget and home/out setting; turn it into a proposal. |
| 15 | Save/connection status | Desktop taskbar shows saving, saved, offline or not saved. Journal retains its existing debounced autosave. Other forms save explicitly; offline cloud writes are not silently queued. |
| 16 | Privacy badges | Journal, record editor, collections and photo details. Prompt answers have their own explicit share checkbox. |
| 17 | Download memories | Gallery → Download memories. Select 1–20 photos (up to 64 MB) for a ZIP with original image files and notes/dates in `memories.json`. |
| 19 | Our playlist | Together → Our playlist. HTTPS song links and personal notes; links open in the music service. |
| 20 | Time capsules | Together → Surprises → Time capsule. Timed letter plus references to shared Gallery photos. Photos themselves were already shared and are not hidden by the capsule. |
| 21 | Thinking-of-you heart | Together header. Durable heart in the other member's notification inbox; server rate-limited. |
| 22 | Memory prompts | Together → Memory prompts. Keep the daily question or create your own, save an own-only draft, then explicitly share an answer. |
| 23 | Date budget planner | Together → Plan together. Food, travel and activity estimates with a calculated total. Estimates are not live prices or transactions. |
| 24 | Reschedule together | Propose a different date while keeping the original plan/notes. Author applies the agreed date explicitly. Pending unsent reminders shift by the same number of calendar days when a record's date changes. |
| 25 | Photo slideshow | Gallery → Slideshow. Previous/next, keyboard arrows, manual play/pause; uses the current album/search results. |
| 26 | Our traditions | Together → Our traditions. Weekly/monthly rituals with the next occurrence and a button to add it to Calendar. Duplicate occurrence checks; future events are created explicitly, not endlessly generated. |

## Privacy, history and delivery

New Together tables use workspace membership RLS. Browser writes go through checked RPCs. Only an entry's author can edit/delete it; both members can leave their own comments, responses and task updates. Checklist responses resolve by the latest server update. Deleting a Together entry permanently removes its responses, not Gallery files. Existing records retain their normal Trash flow.

Sealed entries are excluded by database RLS for the recipient until server opening time. The author has a preview. Shared activity does not expose a locked entry's title/body to the partner. Prompt drafts have author-only read access until shared. **Local preview is browser storage, not private accounts or secure sealing.**

Reminders are personal, opt-in and checked again before delivery. Completed/deleted/inaccessible plans are skipped. Disabling reminders skips pending jobs; enabling later does not replay them. Cancelling a reminder does not retract an already delivered inbox/email message. The worker uses leases, stable Resend idempotency keys, bounded retries and a 23-hour expiry window. No plan body, title, invitation code or private journal content is sent in reminder email. In-app reminders remain available when email is skipped by test-mode limits.

Tables returned to the app are bounded: 500 Together entries, 2,000 actions, 200 recent activity items, 100 inbox items and 200 personal reminders. These are first-release history windows, not infinite pagination. Original record loading retains its existing behavior.

## Troubleshooting reminders

Run this read-only diagnostic in SQL Editor:

```sql
select last_seen_at from public.couple_worker_state;
select jobname, active from cron.job
where jobname in ('gio-agenda-email-minute', 'gio-couple-reminders-minute');
select due_at, email, in_app_sent_at, status, attempts, error_code
from public.couple_reminders order by created_at desc limit 10;
```

A heartbeat means the function reached the database; `sent` means the provider accepted the email, not guaranteed inbox placement. A skipped `test_recipient_only` email means its destination differs from the configured test recipient. Check Resend delivery logs/spam after a successful send. For failed SQL, send the exact error; do not rerun old schema migrations.

## Verification

`npm test`, `npm run build`, and `npm run test:database` cover logic, types/build and local PostgreSQL execution. The database test applies migrations 001–005 and exercises RLS as distinct authenticated roles, sealed letters, prompt privacy, interactions and reminder claims. It stubs Supabase Auth/Storage support and cryptographic invitation helpers; it is not a live Supabase/Resend integration test. Playwright tests cover desktop/mobile flows, persistence and ZIP contents. The reminder Edge Function is separately Deno type-checked.
