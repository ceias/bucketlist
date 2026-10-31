# Gio & Me OS

A little OS for a bigger us. An initial, working React + TypeScript desktop for The Gio & Me Project, using the supplied asset kit’s pastel stationery style.

## Run locally

Requires Node.js 22.12+ (validated with Node 24.19.0) and npm.

```sh
cd /workspace/bucketlist
npm ci
npm run dev
```

The frontend works without backend configuration in **local preview**. Records persist in this browser’s localStorage. Preview data is not shared, backed up, or account-isolated. A “private” flag in preview is not an access-control boundary. Clearing browser data removes it. Local photos are limited to 2 MB each because browser storage is small. Do not use preview for sensitive information.

Open Bucket List and choose “Add the editable 12-month starter plan” to import the requested November 2026–October 2027 goals. Import runs once per local preview or cloud workspace, including after goals are deleted. Starter goals are editable and removable. Financial totals begin at zero; no demonstration money is presented as actual spending.

## Current implementation

- Desktop, dock, launcher search, clock, taskbar, reminders, and 13 app destinations.
- Zustand window management: drag, resize, focus, minimize, maximize, restore, close, and persisted layout. Mobile uses full-screen windows and the app launcher.
- Home derives upcoming plans, goal completion, savings, and journal summaries from accessible records. The desk illustration is CSS, not a clickable raster mockup.
- FullCalendar month/week/day/agenda views, event creation/editing and drag rescheduling. Date plans also appear in the calendar. Anniversary is February 13; the first is in 2027.
- CRUD collections with search and completion filters for goals, date plans, outfits, notes, wishlist, and anniversary letters. Date itineraries are currently multiline text. Outfit plans use a date, budget and notes.
- Tiptap rich-text journal with debounced autosave, entry search, and private entry flags.
- Finance transactions, month filter, actual recorded expense totals, spending chart, individual savings contribution records and combined total, CSV export.
- Photos: validated upload, fixed album categories, editable captions, favorites, viewer, download, soft deletion and restoration.
- Settings: three themes, wallpaper, reduced animation, font preference, JSON data export.
- Supabase client adapter, authentication forms including password reset, workspace creation/pairing, and scoped Realtime refresh. Cloud records use the migration’s policies; account sessions are managed by Supabase.

## Not complete yet

This is an initial implementation, not the complete 27-section specification. Still needed:

- Specialized normalized tables replacing the flexible `records` foundation, and dedicated forms/relationships for each domain.
- Recurring events, event time/location/attachments, event deletion controls in the calendar, linked goal/event IDs and drag-based itinerary ordering.
- Rearrangeable home widgets, a global content search, persistent notifications and recent-app history.
- Journal stickers/photo placement, moods/tags, richer categories, recovery of unsent edits after network failures.
- Custom gallery album CRUD, photo relationship links, album organization, private individual media and storage cleanup on permanent deletion. Current gallery photos are shared with both workspace members. Permanent record deletion does not remove its storage object.
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

The browser tests cover note create/read/persistence/delete/restore, event creation, mobile launcher/full-screen layout, journal autosave persistence, and savings totals. Unit checks cover anniversary boundaries, window placement and the twelve-month seed plan. They do not validate Supabase RLS or the full requested feature set.

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
