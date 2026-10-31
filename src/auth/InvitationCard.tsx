import { useEffect, useState } from 'react';
import { Heart, Check, X, UserRound, LoaderCircle, Clock3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { withRequestDeadline } from '../lib/requestDeadline';
import { useAuth } from '../stores/auth';
import type { PartnerInvitation } from './invitations';
import { AuthForm } from './AuthForm';
import { validInvitation } from './copy';
export function InvitationCard({ code, onDecline, onJoined, existingWorkspace }: { existingWorkspace?: string|null; code: string; onDecline: () => void; onJoined: (workspace: string) => Promise<void> }) {
  const session=useAuth(s=>s.session);const [invite,setInvite]=useState<PartnerInvitation|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;setLoading(true);setError('');
    void (async()=>{try{if(!validInvitation(code))throw Error('This invitation link is invalid.');if(!supabase)throw Error('Connect Supabase to open this private invitation.');const {data,error}=await withRequestDeadline(()=>supabase!.rpc('preview_partner_invitation',{invitation_code:code}));if(error)throw error;if(live)setInvite(data as PartnerInvitation);}catch(e){if(live)setError((e as Error).message);}finally{if(live)setLoading(false);}})();return()=>{live=false;};
  },[code]);
  async function accept() {
    if(!session||!invite)return;setBusy(true);setError('');
    try{const {data,error}=await withRequestDeadline(()=>supabase!.rpc('accept_partner_invitation',{invitation_code:code}));if(error)throw error;useAuth.getState().setMetadata(data.metadata);await onJoined(data.workspace_id);void supabase!.auth.refreshSession().catch(()=>{});}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="partner-request"><div className="request-titlebar"><span><Heart size={14}/> A request from the heart</span><div><i/><i/><button aria-label="Close invitation" disabled={busy} onClick={onDecline}><X size={16}/></button></div></div><div className="request-toolbar"><b>Partner Request</b><span><Heart size={14}/> one little world, two hearts</span></div><div className="request-body">
    {loading?<div className="love-loading"><LoaderCircle className="spin" size={25}/><p>Opening a little love letter…</p></div>:<><span className="request-user-chip"><UserRound size={24}/>{invite?.inviter_name||'Your partner'} <i>.love</i></span><h1>{invite?`${invite.partner_name}, you’re invited.`:'This little letter needs a new link.'}</h1><p>{invite?`${invite.inviter_name} saved you a place in ${invite.workspace_name}.`:'Ask your partner for a fresh invitation from their account.'}</p>{invite&&<><div className="request-match"><Heart size={16}/><span>Two seats. One little world.</span></div><div className="request-love-note"><span className="paper-tape"/><b>{invite.welcome_title}</b><p>{invite.welcome_message}</p></div><small className="request-expiry"><Clock3 size={12}/>Private invitation · expires {new Date(invite.expires_at).toLocaleDateString()}</small></>}
    {error&&<p className="love-form-error" role="alert">{error}</p>}
    {invite&&session&&existingWorkspace?<div className="request-existing-account"><p>You’re already in a private workspace. Share this link with your partner, or switch to their account to accept it.</p><button className="decline-partner" onClick={async()=>{const {error}=await supabase!.auth.signOut();if(error)setError(error.message)}}>Use another account</button></div>:invite&&session?<div className="request-actions"><button className="accept-partner" disabled={busy} onClick={accept}>{busy?<LoaderCircle size={17} className="spin"/>:<Check size={17}/>} {busy?'Making room for us…':'Accept with love'}</button><button className="decline-partner" disabled={busy} onClick={onDecline}>Not now <X size={15}/></button></div>:invite?<AuthForm inviteCode={code} invitedName={invite.partner_name}/>:<button className="decline-partner" onClick={onDecline}>Back to our little corner</button>}</>}
  </div></div>;
}
