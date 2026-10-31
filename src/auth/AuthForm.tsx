import { useState } from 'react';
import { Heart, Mail, KeyRound, UserRound, ArrowRight, LoaderCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { withRequestDeadline } from '../lib/requestDeadline';
import { useAuth } from '../stores/auth';
export function AuthForm({ invitedName = '', inviteCode = '', recovery = false, onRecovered }: { invitedName?: string; inviteCode?: string; recovery?: boolean; onRecovered?: () => void }) {
  const [action,setAction]=useState<'login'|'signup'|'reset'>('login');
  const [name,setName]=useState(invitedName);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  async function submit(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      if(!supabase)throw Error('Connect your Supabase project in .env.local and restart the app to use shared accounts.');
      if(recovery) { const {error}=await withRequestDeadline(()=>supabase!.auth.updateUser({password}));if(error)throw error;setMessage('Your password is updated. Welcome home.');useAuth.setState({recovery:false});onRecovered?.();return; }
      if(action==='reset') { const {error}=await withRequestDeadline(()=>supabase!.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/?recovery=true'}));if(error)throw error;setMessage('If this account exists, a password reset link will arrive in your inbox.');return; }
      if(action==='signup') {
        if(!name.trim())throw Error('Please add your name before creating your account.');
        const {data,error}=await withRequestDeadline(()=>supabase!.auth.signUp({email,password,options:{data:{display_name:name.trim()},emailRedirectTo:location.origin+(inviteCode?'/?invite='+encodeURIComponent(inviteCode):'/')}}));
        if(error)throw error;if(!data.session)setMessage('Your little corner is almost ready. Confirm your email, then come back and log in.');
      } else { const {error}=await withRequestDeadline(()=>supabase!.auth.signInWithPassword({email,password}));if(error)throw error; }
    } catch(e) { setError((e as Error).message); }
    finally {setBusy(false);}
  }
  return <form className="love-auth-form" onSubmit={submit}>
    {!recovery&&<div className="love-auth-tabs"><button type="button" className={action==='login'?'selected':''} onClick={()=>{setAction('login');setError('');setMessage('');}}>Log in</button><button type="button" className={action==='signup'?'selected':''} onClick={()=>{setAction('signup');setError('');setMessage('');}}>Create account</button></div>}
    {recovery?<><span className="eyebrow">A FRESH LITTLE START</span><h2>Choose a new password.</h2></>:<><span className="eyebrow">{inviteCode?'YOUR PARTNER IS WAITING':'JUST THE TWO OF US'}</span><h2>{action==='signup'?'Our story starts here.':action==='reset'?'Let’s bring you home.':'Hello again, sweetheart.'}</h2><p>{inviteCode?'Sign in or create an account, then accept your invitation.':action==='reset'?'We’ll send a link to help you reset your password.':'Your memories, your plans, your own little world.'}</p></>}
    {!recovery&&action==='signup'&&<label><span><UserRound size={14}/>Your name</span><input name="name" autoComplete="given-name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder={invitedName||'What should we call you?'}/></label>}
    {!recovery&&<label><span><Mail size={14}/>Email address</span><input name="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>}
    {(recovery||action!=='reset')&&<label><span><KeyRound size={14}/>{recovery?'New password':'Password'}</span><input name="password" type="password" autoComplete={action==='signup'||recovery?'new-password':'current-password'} required minLength={action==='signup'||recovery?8:undefined} value={password} onChange={e=>setPassword(e.target.value)} placeholder={recovery||action==='signup'?'At least 8 characters':'Your little secret'}/></label>}
    {error&&<p className="love-form-error" role="alert">{error}</p>}{message&&<p className="love-form-message" role="status">{message}</p>}
    <button className="love-submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Heart size={16}/>} {busy?'One little moment…':recovery?'Save new password':action==='signup'?'Create our little account':action==='reset'?'Send reset link':'Let me in, with love'} {!busy&&<ArrowRight size={16}/>}</button>
    {!recovery&&<button className="love-forgot" type="button" onClick={()=>{setAction(action==='reset'?'login':'reset');setError('');setMessage('');}}>{action==='reset'?'Back to log in':'Forgot your password?'}</button>}
  </form>;
}
