import { validInvitation } from './copy';
const storageKey = 'gio-me-pending-invite';
export function pendingInvitation() {
  const code = new URLSearchParams(location.search).get('invite');
  if (code !== null) { if (validInvitation(code)) localStorage.setItem(storageKey, code); return code || 'invalid'; }
  const remembered = localStorage.getItem(storageKey) || '';
  return validInvitation(remembered) ? remembered : '';
}
export function clearInvitation() {
  localStorage.removeItem(storageKey);
}
export function invitationLink(code: string) {
  if (!validInvitation(code)) throw Error('Could not create a valid invitation. Try again.');
  return `${location.origin}/?invite=${encodeURIComponent(code)}`;
}
export type PartnerInvitation = { inviter_name: string; workspace_name: string; partner_name: string; welcome_title: string; welcome_message: string; expires_at: string };
