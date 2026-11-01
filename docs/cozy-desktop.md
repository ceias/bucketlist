# Our cozy desktop and comfort jar

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

## Pastel desktop and typography

The desktop now takes inspiration from pastel custom computer desktops: pink gingham, a striped candy-heart wallpaper, framed memory/calendar-style widgets and sticker-like shortcuts. Your photo, note, countdown, jar and cat continue to work normally.

Open **Settings → Typography** to choose **Classic stationery**, **Simple & clear**, **Soft round (Nunito)**, **Bubblegum (Fredoka)**, **Notebook (Patrick Hand)** or **Pixel diary (VT323)**. The six preview cards apply the choice immediately, and it persists on this browser/device. Existing saved font preferences are retained; new browsers start with Soft round. Pixel and handwritten styles use readable text for controls and longer passages. The wallpaper wordmark remains a consistent display treatment.

The four additional fonts are bundled locally, with their Open Font Licenses in `public/fonts`. No Google Fonts or other font-service request is needed when visiting the site. No Supabase changes are needed.
