# Pink-and-green desktop and comfort jar

This update needs **no new Supabase SQL, secrets, schedules or function deployment**. Wait for Vercel's frontend deployment, then refresh. Local development: pull main, run `npm install`, then `npm run dev`.

- Click **Desktop** in the taskbar to see the desk. It now keeps the Desktop view after refresh; Home remains available as the fuller dashboard.
- The desk has a personal greeting, six app shortcuts, a shared-memory Polaroid, an editable sticky note, a countdown and three upcoming plans. The full calendar opens from Coming up; the top-bar Agenda widget is retained.
- Click the pencil under the Polaroid to choose an existing shared photo. With no choice, a favorite/recent photo is shown. The pin choice is personal to this browser/device; photos remain shared through the workspace.
- Click the sticky note pencil to leave a message. It saves as an ordinary **shared Notes record**, using existing workspace access rules, and is visible to both partners. It can also be edited or trashed in Notes. Private notes are never used as desktop messages. In browser preview it stays on this browser.
- Click the **comfort jar** or **Joy jar** in the top bar to play the claw game. Move with the range slider, keyboard arrows while the slider is focused, or the left/right buttons. Align with a cat and catch a little joy. A near miss still gives a kind message; there are no payments, scores or penalties.
- Five collectible cats each have a gentle message and a small suggestion. A quiet-breath guide is optional and can be stopped at any time. The collection stays on this device, not in the shared database. Messages rotate and the five-cat collection resets at each clock-hour boundary (for example, 1:00 PM then 2:00 PM in the Philippines/Singapore). The jar displays its next refresh time. Refreshing the page within that hour preserves the current collection; returning after an hour boundary starts a fresh one. Photo pins and Mochi preferences are preserved.
- **Mochi**, the pixel cat, is a movable guide. Drag with a mouse or finger; focus the cat and use arrow keys to reposition it. Tap/click for directions to the comfort game, desk and calendar. Hide it from its bubble, restore it from the desktop footer, or use **Settings → Mochi, our desktop guide** to show/hide/reset its position.
- Motion preferences are respected. Game controls remain operable with reduced motion. The game may be closed during an animation; timers are cleaned up. Escape closes the active modal even if an animated control temporarily lost focus.

The responsive layout and input interactions are browser-tested at desktop and phone widths. Actual iPhone Safari and Samsung browser checks still need to be performed on your devices. A pixel cat was implemented as the guide; personalized pixel portraits are not part of this update.

## Appearance and typography

The site uses a retro personal-computer style: dark outlines, cream panels, hard offset shadows, diagonal pink-and-green wallpaper and custom outlined desktop icons. The same treatment applies to app windows, controls, dialogs, login, calendar, gallery, notebook and Together Space. Your photo, note, countdown, jar and cat continue to work normally. Choose **Settings → Pink & Green** for the reference palette; this is the default for new browsers. Existing saved theme choices are retained, with the new outlined interface applied throughout.

Open **Settings → Typography** to choose **Classic stationery**, **Simple & clear**, **Soft round (Nunito)**, **Bubblegum (Fredoka)**, **Notebook (Patrick Hand)** or **Pixel diary (VT323)**. The six preview cards apply the choice immediately, and it persists on this browser/device. Existing saved font preferences are retained; new browsers start with Soft round. Pixel and handwritten styles use readable text for controls and longer passages. Some window/control labels use a fixed readable face while app headings keep your selected typography.

The four additional fonts are bundled locally, with their Open Font Licenses in `public/fonts`. No Google Fonts or other font-service request is needed when visiting the site. No Supabase changes are needed.

Choose a saved appearance in **Settings → Theme**. Five additional styles are available alongside the existing palettes:

- **Midnight Terminal** — indigo-black panels, white pixel outlines and dithered title bars.
- **Classic Macintosh** — gray windows, striped title bars and checkerboard wallpaper.
- **Sweetheart Aero** — glossy pink title bars, rounded controls and green action buttons.
- **Soft Finder** — white windows, blush details, traffic-light window controls and a pinned application dock.
- **Graphite Dock** — silver frames, a textured gray desktop and a classic icon dock.

Themes apply to the desktop and app windows. The dock launches pinned apps and includes other open apps; scroll it horizontally on small screens. Theme choices remain saved on this browser after refresh. Existing palettes and font choices remain available, and photos retain their original colors. No database setup is required.
