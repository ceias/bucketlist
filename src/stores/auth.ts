import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useData } from './data';
import { withRequestDeadline } from '../lib/requestDeadline';
type AuthState = { session: Session | null; ready: boolean; error: string; recovery: boolean; setMetadata: (metadata: Record<string, unknown>) => void };
export const useAuth = create<AuthState>((set) => ({
  session: null, ready: !supabase, error: '', recovery: false,
  setMetadata: metadata => set(s => ({ session: s.session ? { ...s.session, user: { ...s.session.user, user_metadata: { ...s.session.user.user_metadata, ...metadata } } } : null })),
}));
let initialized = false;
export function initializeAuth() {
  if (initialized || !supabase) return;
  initialized = true;
  let revision = 0;
  supabase.auth.onAuthStateChange((event, session) => {
    revision++;
    useAuth.setState({ session, ready: true, error: '', ...(event === 'PASSWORD_RECOVERY' ? { recovery: true } : {}) });
    if (event === 'SIGNED_OUT') { useData.getState().disconnect(); useAuth.setState({ recovery: false }); }
  });
  const start = revision;
  void withRequestDeadline(() => supabase!.auth.getSession()).then(({ data, error }) => {
    if (start !== revision) return;
    useAuth.setState({ session: data.session, ready: true, error: error?.message || '' });
  }).catch(error => { if (start === revision) useAuth.setState({ ready: true, error: (error as Error).message }); });
}
