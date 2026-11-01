import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, ArrowRight, Sparkles, LoaderCircle, LogOut, UserRound, KeyRound, Link, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { withRequestDeadline } from '../lib/requestDeadline';
import { usePreferences } from '../stores/preferences';
import { useAuth, initializeAuth } from '../stores/auth';
import { useData } from '../stores/data';
import { displayName, validInvitation, welcomeCopy } from './copy';
import { clearInvitation, pendingInvitation } from './invitations';
import { AuthForm } from './AuthForm';
import { InvitationCard } from './InvitationCard';
import { PartnerInvite } from './PartnerInvite';

function LoveFrame({ children }: { children: React.ReactNode }) {
  const motion=usePreferences(s=>s.motion);const theme=usePreferences(s=>s.theme);
  return <main className={`love-screen theme-${theme} ${motion?'':'no-motion'}`}><div className="love-brand"><img src="/assets/decorations/flower.svg" alt=""/><span>Gio & Bri <b>OS</b></span><Heart size={15}/></div><div className="love-floating-hearts" aria-hidden="true">{Array.from({length:9},(_,i)=><Heart key={i} className={`floating-heart heart-${i}`} fill="currentColor"/>)}</div>{children}<footer className="love-screen-footer">a little OS for a bigger us <Heart size={12}/> made for our ordinary, extraordinary days</footer></main>;
}
function BrowserChrome() { return <div className="love-browser-chrome"><span><i/><i/><i/></span><div><Heart size={11}/> our little corner / welcome</div><Heart size={18}/></div>; }
function Welcome({ onEnter, workspace }: { onEnter: () => void; workspace: string }) {
  const session=useAuth(s=>s.session)!;const copy=welcomeCopy(session.user);
  return <section className="love-welcome-card"><div className="welcome-envelope"><img src="/assets/notebook/love-letter.svg" alt=""/><span className="welcome-name-tag">for {copy.name}, with all my love</span></div><span className="eyebrow">YOU HAVE A HOME IN ME</span><h1>{copy.title}</h1><p className="welcome-love-message">{copy.message}</p><div className="welcome-little-hearts" aria-hidden="true"><Heart/><Heart fill="currentColor"/><Heart/></div><button className="love-submit" onClick={onEnter}><Heart size={17}/>Enter our little world<ArrowRight size={17}/></button><details className="welcome-invite-option"><summary><Link size={14}/>Invite my other half</summary><PartnerInvite workspace={workspace}/></details></section>;
}
export function AuthGate({ children }: { children: React.ReactNode }) {
  const {session,ready,error:authError,recovery}=useAuth();const [params,setParams]=useSearchParams();
  const [invite,setInvite]=useState(pendingInvitation);const [welcomed,setWelcomed]=useState(false);const [preview,setPreview]=useState(false);
  const [workspace,setWorkspace]=useState<string|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [code,setCode]=useState('');const [retry,setRetry]=useState(0);
  useEffect(()=>{initializeAuth()},[]);
  useEffect(()=>{const incoming=params.get('invite');if(incoming!==null)setInvite(pendingInvitation());},[params.get('invite')]);
  useEffect(()=>{
    if(!session||!supabase){setWorkspace(null);setWelcomed(false);return;}
    let live=true;setLoading(true);setError('');
    void (async()=>{try{const {data,error}=await withRequestDeadline(signal=>supabase!.from('workspace_members').select('workspace_id').eq('user_id',session.user.id).abortSignal(signal));if(error)throw error;const id=data?.[0]?.workspace_id||null;if(id)await useData.getState().connect(id,session.user.id);if(live)setWorkspace(id);}catch(e){if(live)setError((e as Error).message)}finally{if(live)setLoading(false)}})();
    return()=>{live=false};
  },[session?.user.id,retry]);
  const forceLogin=params.has('login');const invitePartner=params.has('invitePartner');
  function leaveInvite() {clearInvitation();setInvite('');setParams(previous=>{const next=new URLSearchParams(previous);next.delete('invite');return next},{replace:true});}
  async function joined(id:string) {await useData.getState().connect(id,session!.user.id);setWorkspace(id);setWelcomed(false);leaveInvite();}
  async function createWorkspace() {setBusy(true);setError('');try{const {data,error}=await withRequestDeadline(()=>supabase!.rpc('create_workspace',{workspace_name:'Our Little Corner'}));if(error)throw error;await useData.getState().connect(data,session!.user.id);setWorkspace(data);}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const logOut=async()=>{try{const {error}=await supabase!.auth.signOut();if(error)throw error}catch(e){setError((e as Error).message)}};
  if(!supabase&&!invite&&(!forceLogin||preview))return <>{children}</>;
  if(!ready)return <LoveFrame><div className="love-loading"><LoaderCircle className="spin" size={28}/><p>Opening our little world…</p></div></LoveFrame>;
  if(invite)return <LoveFrame><InvitationCard existingWorkspace={workspace} code={invite} onDecline={leaveInvite} onJoined={joined}/></LoveFrame>;
  if(!session||recovery||params.has('recovery'))return <LoveFrame><section className="love-login-window"><BrowserChrome/><div className="love-login-content"><aside className="love-profile-card"><div className="love-profile-polaroid"><img src="/assets/notebook/love-letter.svg" alt="A letter sealed with a heart"/><span>sweetheart, you belong here ♡</span></div><h1>A little world.<br/><em>A whole lot of love.</em></h1><p>For the plans we make.<br/>The memories we keep.<br/>And every little day in between.</p><span className="love-profile-seal"><Heart size={13}/>Gio & Me · always, in all ways</span></aside><AuthForm recovery={!!session&&(recovery||params.has('recovery'))} onRecovered={()=>setParams({},{replace:true})}/></div></section>{authError&&<p className="love-form-error" role="alert">{authError}</p>}{!supabase&&<button className="love-preview-button" onClick={()=>{setPreview(true);setParams({},{replace:true})}}>Explore local preview<ArrowRight size={14}/></button>}</LoveFrame>;
  if(loading)return <LoveFrame><div className="love-loading"><LoaderCircle className="spin" size={28}/><p>Making a little room for {displayName(session.user)}…</p></div></LoveFrame>;
  if(error)return <LoveFrame><section className="workspace-setup-card"><Heart size={30}/><h1>Let’s reconnect our little corner.</h1><p className="love-form-error" role="alert">{error}</p><button className="love-submit" onClick={()=>setRetry(n=>n+1)}>Try again</button><button className="love-forgot" onClick={logOut}>Log out</button></section></LoveFrame>;
  if(!workspace)return <LoveFrame><section className="workspace-setup-card"><span className="love-setup-icon"><UserRound size={30}/><Heart size={15}/></span><span className="eyebrow">HELLO, {displayName(session.user).toUpperCase()}</span><h1>Just us. Our own little world.</h1><p>Create your shared corner, or join the place your partner has saved for you.</p><button className="love-submit" disabled={busy} onClick={createWorkspace}>{busy?<LoaderCircle className="spin" size={16}/>:<Sparkles size={16}/>}Create our little world</button><div className="love-or"><span/>or join your partner<span/></div><label className="love-manual-invite"><KeyRound size={14}/>Have an invitation code?<input aria-label="Partner invitation code" value={code} onChange={e=>setCode(e.target.value.trim())} placeholder="Paste your private invitation code"/></label><button className="button" disabled={!validInvitation(code)} onClick={()=>{localStorage.setItem('gio-me-pending-invite',code);setInvite(code)}}>Open my invitation<ArrowRight size={14}/></button><button className="love-forgot" onClick={logOut}><LogOut size={13}/>Log out</button></section></LoveFrame>;
  if(invitePartner)return <LoveFrame><section className="invite-page-card"><button className="text-button" onClick={()=>setParams(previous=>{const next=new URLSearchParams(previous);next.delete('invitePartner');return next},{replace:true})}><ArrowLeft size={14}/>Back to our little world</button><PartnerInvite workspace={workspace}/></section></LoveFrame>;
  if(!welcomed)return <LoveFrame><Welcome workspace={workspace} onEnter={()=>{setWelcomed(true);setParams(previous=>{const next=new URLSearchParams(previous);next.delete('login');return next},{replace:true})}}/></LoveFrame>;
  return <>{children}</>;
}
