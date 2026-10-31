# Gio & Me OS

A little OS for a bigger us. An initial, working React + TypeScript desktop for The Gio & Me Project, using the supplied asset kit’s pastel stationery style.

## Run locally

Requires Node.js 22.12+ (validated with Node 24.19.0) and npm.

```sh
cd /workspace/bucketlist
npm ci
npm run dev
```

For development on this computer, prefer `http://localhost:5173`. When accessing a Vite network address over plain HTTP, the app generates UUIDs using `crypto.getRandomValues` if `crypto.randomUUID` is unavailable. It never falls back to `Math.random`. Local preview storage belongs to each browser origin, so localhost and a LAN address have separate preview data. Production should use HTTPS.

The frontend works without backend configuration in **local preview**. Records persist in this browser’s localStorage. Preview data is not shared, backed up, or account-isolated. A “private” flag in preview is not an access-control boundary. Clearing browser data removes it. Local photos are limited to 2 MB each because browser storage is small. Do not use preview for sensitive information.

Open Bucket List and choose “Add the editable 12-month starter plan” to import the requested November 2026–October 2027 goals. Import runs once per local preview or cloud workspace, including after goals are deleted. Starter goals are editable and removable. Financial totals begin at zero; no demonstration money is presented as actual spending.

## Easier navigation and new planning tools

- **Navigation:** all apps are grouped in the left sidebar. Use **Apps** or **Ctrl/Cmd + K** to search for an app. The top **Agenda** button opens your schedule from any application. **Desktop** minimizes the open windows; the taskbar restores them. Shortcuts open with one click.
- **Calendar widgets:** Home and the desktop include an interactive month calendar and agenda. Click a day to see its scheduled plans, switch to **Coming up**, or open the **Nov goals** (current displayed month) tab for flexible monthly goals. Click a goal to edit it, or choose **Add a plan**. The arrow opens the full calendar at the selected date.
- **Bulk bucket-list import:** choose **Paste agendas** in Bucket List. Paste one goal per line, optionally under month headings. Review the automatically grouped list before importing. Matching title/date duplicates are skipped, and invalid dates are flagged. Imports are limited to 200 new goals at a time. The optional calendar checkbox includes goals in the calendar and agenda: monthly goals have their own month section, while dated goals appear on the selected calendar day. Change timing later with **Month only / Specific day** in the goal editor.

  Example:

  ```text
  November 2026 — Matching Era
  - Buy matching shirts
  - Choose coordinated colors

  December 2026 — BGC Food Crawl
  2026-12-12 | Go Bento lunch | Food | Try something new together
  2026-12-12 | A photobooth stop | Memories
  ```

  Month-only entries remain flexible goals for the whole month. They appear as “Any day in November,” for example, and never create a November 1 calendar marker. Only explicitly dated goals appear on calendar days. A heading such as “November” without a year uses the selected default year. An unheaded list uses the selected default month. Dates use `YYYY-MM-DD`; this deterministic parser does not guess ambiguous natural-language dates. The review screen is editable through the pasted text. The import is saved in a single batch, and a retry reuses its record IDs. Cloud imports stop waiting after 15 seconds if Supabase does not respond; your paste stays in the dialog for a retry. A timeout does not prove the server rejected the write, so retry in the same dialog to reuse those IDs.
- **Notebook journal:** month tabs along the page edge organize entries by month and year. Use **Previous/Next** to turn pages, **This month** to return to the current chapter, and **New page** to start writing. Rich text autosaves; date/title/private changes and sticky-note highlights save when edited (sticky notes save when leaving their text field). Pending text saves before switching pages. Page-turn effects respect reduced motion.
- **Photo details:** click a photo or **Details** to edit its file name, notes, and album, then choose **Save changes**. The new name is used in the gallery and downloaded file; the original image format and stored image remain intact. Search includes names and photo notes. Existing uploaded photos work with the new editor.
- **Stationery and effects:** custom SVG pressed flowers, a love letter and a postage stamp, spiral binding, washi tape, hover effects, completion feedback and page turns. Dialogs support keyboard focus trapping and Escape. Reduced motion is respected.

For earlier imports that were assigned the first day automatically, open Bucket List and click **Correct month-only dates** beside that month. Select only the goals intended for the whole month, then confirm **Make … month-only**. Nothing is preselected: genuinely scheduled first-day goals must remain unchanged. The correction preserves goal IDs, notes, completion state and workspace ownership. No database migration is needed.

For database integrations: the existing `date` column retains a first-day sorting anchor for monthly goals, while `data.datePrecision = "month"` and `data.targetMonth = "YYYY-MM"` identify their actual timing. A month anchor is not a scheduled date. Explicit dates use `data.datePrecision = "day"`. Legacy first-day records have no precision marker, so the application asks for selective correction rather than guessing.

## Current implementation

- Desktop, grouped app dock, launcher search, clock, taskbar, reminders, interactive agenda widgets, and 13 app destinations.
- Zustand window management: drag, resize, focus, minimize, maximize, restore, close, and persisted layout. Mobile uses full-screen windows and the app launcher.
- Home derives upcoming plans, goal completion, savings, and journal summaries from accessible records. The desk illustration is CSS, not a clickable raster mockup.
- FullCalendar month/week/day/agenda views, event creation/editing and drag rescheduling. Date plans also appear in the calendar. Anniversary is February 13; the first is in 2027.
- CRUD collections with search and completion filters for goals, date plans, outfits, notes, wishlist, and anniversary letters. Date itineraries are currently multiline text. Outfit plans use a date, budget and notes.
- Tiptap rich-text notebook journal with month/year tabs, page turns, sticky highlights, debounced autosave, entry search, and private entry flags.
- Finance transactions, month filter, actual recorded expense totals, spending chart, individual savings contribution records and combined total, CSV export.
- Photos: validated upload, album navigation, editable file names and notes, search, favorites, viewer, renamed downloads, soft deletion and restoration.
- Settings: three themes, wallpaper, reduced animation, font preference, JSON data export.
- Supabase client adapter, authentication forms including password reset, workspace creation/pairing, and scoped Realtime refresh. Cloud records use the migration’s policies; account sessions are managed by Supabase.

## Not complete yet

This is an initial implementation, not the complete 27-section specification. Still needed:

- Specialized normalized tables replacing the flexible `records` foundation, and dedicated forms/relationships for each domain.
- Recurring events, event time/location/attachments, event deletion controls in the calendar, linked goal/event IDs and drag-based itinerary ordering.
- Rearrangeable home widgets, a global content search, persistent notifications and recent-app history.
- Journal stickers/photo placement, moods/tags, richer categories, recovery of unsent edits after network failures.
- Custom album creation/renaming/deletion, photo relationship links, date/location organization, private individual media and storage cleanup on permanent deletion. Current gallery photos are shared with both workspace members. Permanent record deletion does not remove its storage object.
- Savings targets/budget settings, partner-specific finance dashboards, expanded finance filters and validated separate contribution/transaction models.
- Clothing photos, palettes, purchase workflow, automatic next-month outfit reminders.
- Secure scheduled letter unlock, time capsules, video messages, annual 13-reason collections and timeline. Vault letters in this version are available immediately to authorized readers.
- Wishlist conversion into linked events/goals, pinned desktop notes, note autosave, per-user cloud preference sync.
- Invite revocation UI, account/workspace deletion, hardened production recovery flows, accessibility and performance audits.

Cloud SQL/auth/storage/security behavior has **not been validated against a live Supabase project** in this environment. Browser and unit tests exercise local preview. Do not treat authored policies as a completed security audit.

## Supabase Cloud setup (no local database)

1. Create a Supabase Cloud project using a suitable plan. No PostgreSQL installation, Docker backend, Express, or additional database is needed.
2. In SQL Editor, run `supabase/migrations/202610310001_initial_workspace.sql` once. It creates workspaces, memberships, hashed expiring invitations, records, RLS, functions, and the private `memories` storage bucket. Keep the database administrator/service-role key out of the frontend.
3. In Authentication, enable email/password sign-in. Choose whether to require email confirmation. Set Site URL to your frontend origin and add your development and production origins to the permitted redirect URLs. Password recovery returns to `/?recovery=true`.
4. In Project Settings → API / API Keys, obtain the project URL and public **publishable key** (not the service-role or secret key). Copy `.env.example` to `.env.local` and populate:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
   ```

   These two values are intentionally public frontend configuration. Never put privileged keys in a `VITE_` variable. Real values are not included in this repository.
5. Restart Vite. Open Settings, sign up, confirm your email if enabled, then log in. Create a workspace. Generate an invitation and share its code privately with your partner. The second account can join using that code. Invites expire after 48 hours, are single-use, and creating a new code invalidates the old one.
6. Backend functions serialize membership changes, enforce one workspace per account and at most two members. No direct client write policies exist for memberships or invitations. Private text records are readable only by their owner. Shared records can be edited/deleted by either partner; ownership cannot be reassigned.
7. Enable Realtime for `public.records` in Supabase’s replication settings if you want live refresh between partners. The frontend subscribes to the current workspace. Ordinary reads and writes work without Realtime.
8. Storage objects use `workspace-id/user-id/object-id.ext` paths. The private bucket accepts JPEG, PNG and WebP up to 8 MB. Both workspace members may read shared photos through expiring signed URLs; upload/delete policies require the uploader’s user ID in the path. Text-only private journals do not use shared gallery storage.

Local preview data is not automatically uploaded or merged when signing in. Export it before switching if you want a copy. Browser settings and window layouts currently stay local.

### Required cloud verification before production

Using separate browser profiles for accounts A, B and C:

- A creates a workspace, B joins with a fresh invitation; C must be rejected from the same workspace. Test simultaneous acceptance attempts as well.
- A/B can read shared records. A’s private note/journal/letter cannot be read by B or C via the database API, including guessed IDs. C cannot access any workspace record.
- Unauthenticated requests cannot access records or photos. B can read A’s shared photo but cannot upload/delete objects under A’s user prefix. A third account cannot read those objects, including signed-URL creation attempts.
- Expired/used invitations are rejected. A member cannot change a record’s ownership/workspace or make another person’s shared record private.
- Test sign-in/out, verification, recovery, session refresh, disconnected saves, media failures, refresh persistence and Realtime between partners.

## Development and tests

```sh
npm run build         # TypeScript + Vite production bundle
npm test              # Vitest domain checks
npm run dev -- --port 5173
npx playwright test   # separate terminal; browser flows against that server
```

The Playwright config uses `/usr/bin/chromium`, which exists in this cloud environment. On another machine, install a Playwright browser with `npx playwright install chromium` and remove `executablePath` from `playwright.config.ts` or point it to your system Chromium. Browser downloads may require allowing `cdn.playwright.dev`; this environment used its existing verified system browser instead. Playwright does not start the server automatically.

Browser tests cover note create/read/persistence/delete/restore, event creation, window controls, mobile navigation, bulk import/deduplication, agenda editing, notebook pages/sticky notes, photo metadata and download names, journal autosave persistence, and savings totals. Unit checks cover anniversary boundaries, window placement, the twelve-month seed plan, import parsing/validation, agenda inclusion and safe photo renaming. They do not validate Supabase RLS or the full requested feature set.

## Vercel deployment

1. Put this project in your Git repository and import it in Vercel. No push or deployment was performed during setup.
2. Use the Vite preset: install `npm ci`, build `npm run build`, output directory `dist`. Select Node 22.12+ or 24.
3. Add the two public Supabase variables in Vercel’s project environment settings for each relevant deployment environment. Redeploy after changes: Vite embeds their values at build time.
4. `vercel.json` sends client routes to the SPA. Configure Supabase Site URL and redirect allowlist for your actual production domain; explicitly allow any preview domains you use for testing.
5. Verify authentication, pairing, private data access, upload/download, cross-device refresh, mobile layout and password recovery against the deployed origin before entering real personal data.

Free-tier quotas and project availability can change. Review current Supabase database/storage/egress/auth/Realtime limits and Vercel usage terms in their dashboards. This implementation makes no live restaurant availability or pricing requests.

## Structure and asset use

`src/apps` contains applications; `src/components` contains the window shell and record form; `src/stores` holds window/data/preferences state; `src/lib` defines app metadata and the Supabase client. Application content is lazy-loaded so calendar, chart and editor dependencies are loaded when needed. `supabase/migrations` holds Cloud SQL; `tests` contains browser flows.

The supplied archive was extracted and its README, palette, SVG sources, mission data and raster concept inspected. `public/assets/icons` preserves its editable SVG icon set; `public/assets/decorations` preserves its four decorations. Flower and clover SVGs are reused directly. Functional controls use Lucide. Wallpaper, title bars, cards, calendar, desk illustration, notebooks and windows are real CSS/React components. Raster mockup/crops remain design references outside the application bundle. Prompt dates/currency override illustrative mockup samples.
