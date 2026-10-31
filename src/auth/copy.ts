export const PARTNER_NAME = 'Gio';
export const PARTNER_WELCOME_TITLE = 'Welcome home, my baby! ♡';
export const PARTNER_WELCOME_MESSAGE = `Hi, my love! Welcome to our little world, a space just for you and me. Here, we'll collect our memories, plan our adventures, and cherish every little moment together.

No matter where life takes us, I hope this space always reminds you that you have a home in me.

I love you, Gio. Always and in all ways. ♡`;
export function displayName(user: { user_metadata?: Record<string, unknown>; email?: string } | null | undefined) {
  const value = user?.user_metadata?.display_name;
  return typeof value === 'string' && value.trim() ? value.trim().slice(0,80) : user?.email?.split('@')[0] || 'my love';
}
export function welcomeCopy(user: { user_metadata?: Record<string, unknown>; email?: string }) {
  const name = displayName(user);
  const forGio = name.toLowerCase() === 'gio';
  const meta = user.user_metadata || {};
  return { name, title: typeof meta.welcome_title === 'string' ? meta.welcome_title : forGio ? PARTNER_WELCOME_TITLE : `Welcome home, ${name}. ♡`, message: typeof meta.welcome_message === 'string' ? meta.welcome_message : forGio ? PARTNER_WELCOME_MESSAGE : 'A little space for our memories, our next adventures, and all the ordinary days that feel extraordinary together.\n\nYou belong here. You are so loved.' };
}
export const validInvitation = (code: string) => /^[a-f0-9]{48}$/.test(code);
