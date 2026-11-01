# Shared website visits and sign-ins

Open **Settings → Website visits & sign-ins** to see each member's last shared website visit, last sign-in, and up to 20 recent events from the last 30 days.

## One-time setup

1. Run only [`202611010006_shared_visit_activity.sql`](https://github.com/ceias/bucketlist/blob/main/supabase/migrations/202611010006_shared_visit_activity.sql) once in a new Supabase SQL Editor query, after migration 005. Do not rerun previous migrations or the workspace merge.
2. Wait for the frontend deployment and refresh the website.
3. Each member independently chooses **Share my website activity with my partner** in their own Settings. Sharing starts off. To see Gio's activity, Gio must enable his setting; turning on yours shares your activity, not his.

No new secrets, Resend setup, Edge Functions, or schedules are needed. This feature does not send emails.

## What the times mean

- **Last website visit:** a signed-in member entered the app or returned to a visible tab after at least a minute since the last attempt. It is not a live presence heartbeat or a measure of time spent. It cannot prove whether someone is currently online.
- **Last signed in:** the real `auth.users.last_sign_in_at` supplied by Supabase Auth, shown only if it falls after sharing began. An ordinary session restore or token refresh is not recorded as a new password sign-in.
- Recent visit events are grouped within 15 minutes to avoid duplicate focus/tab events. Sign-in events are deduplicated by the Auth timestamp. Settings refreshes while visible every minute and when the tab regains focus.
- History starts when the member opts in. Past visits are not reconstructed. Disabling sharing deletes that member's stored events in the current workspace and hides their visit/sign-in timestamps on the next refresh. Re-enabling starts a new sharing period.

Only the current workspace's members can retrieve its activity. Both members can choose sharing independently; neither can enable it for the other. Database tables have RLS enabled and no direct browser grants; checked RPCs derive the current user and workspace from authentication. Outsiders and anonymous callers are rejected. Shared fields contain names, event types and timestamps only—no passwords, IPs, device details, page URLs or browsing duration.

The interface shows at most the latest 20 events per member within 30 days. Older stored entries are removed when that account next records a visit; opting out removes all of its current-workspace events immediately. If membership changes, sharing does not automatically transfer to a new workspace. Existing admin merge scripts should not be used to migrate this history; use a dedicated reviewed migration if needed.

The migration was executed against the local PostgreSQL test engine with separate authenticated roles, including default-off, opt-in, timestamp source, deduplication, direct-table/outsider denial and opt-out removal checks. Browser checks use simulated Supabase responses. Live Supabase Auth sign-in behavior and device focus events should still be verified on your deployed site.
