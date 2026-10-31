# Merge two solo workspaces

Use this administrator repair when both partners accidentally created separate workspaces. This is not an invitation bypass available to website users. If the source has new Together Space content, the script stops rather than leaving it behind; request a dedicated merge for those tables. Both accounts must have confirmed emails, and each workspace must have exactly one member. Requires migrations 001–004.

1. Have both partners sign out of the website and pause edits/uploads until finished. Keep a project backup or export first, using the backup/export tools available on your Supabase plan.
2. Open `supabase/admin/merge_solo_workspaces.sql` and copy the whole script into a **new** Supabase SQL Editor query, using the project administrator role.
3. Replace only these two values in the `declare` block:

   ```sql
   keep_email text := 'YOUR_WEBSITE_EMAIL_HERE';
   move_email text := 'GIOS_WEBSITE_EMAIL_HERE';
   ```

   Use your confirmed website login email for `keep_email` and your partner’s confirmed website login email for `move_email`. Never put actual account emails into a public commit.
4. Run the complete script once. A successful query commits the merge. Any error rolls back the complete transaction; stop and inspect it rather than deleting records or rerunning initial migrations. If it reports “Already paired,” the accounts are already in the same workspace.
5. Both partners sign in again and refresh. Open **Gallery → All memories** and check shared goals, calendar, and Trash. Private entries remain accessible only to their original owner. Test a new upload from each account. For email updates, each account still needs its own opt-in, and Resend test-mode recipient restrictions still apply.

The script validates both identities, solo membership, existing record ownership, source photo paths and file existence. It moves all source records including soft-deleted records, while keeping IDs, owners, dates and private flags. It does not deduplicate similarly named goals.

Photo bytes and Storage object names are unchanged. A private administrator-managed alias maps the old folder to the shared workspace. Restricted Storage policies allow current shared-workspace members to read the merged folder, and only the original uploader to delete its files. Ordinary users cannot create aliases. Never rename files by directly updating `storage.objects`; that does not move the underlying objects.

The old workspace stays empty, and its folder remains in Storage. Do not delete either: the alias preserves access to its photo files. Outstanding invitations to both workspaces are invalidated. Pending source email jobs are skipped to avoid replaying old agenda alerts. Existing email preferences, notification history, schedule, keys and secrets are retained.

The record-ownership trigger is suspended only inside the locked administrator transaction and re-enabled before commit. Website access policies and the two-member limit remain unchanged. This script has SQL/PLpgSQL syntax validation, but has not been executed against your live Supabase database. Verify the merged workspace there after running it.
