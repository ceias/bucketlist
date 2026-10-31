import { useEffect, useState } from 'react';
import { Mail, LoaderCircle } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { useData } from '../stores/data';
import { supabase } from '../lib/supabase';
import { withRequestDeadline } from '../lib/requestDeadline';
type Preference={enabled:boolean;delivery_ready:boolean;test_mode?:boolean};
export function EmailPreferences() {
  const user=useAuth(s=>s.session?.user);const mode=useData(s=>s.mode);
  const [preference,setPreference]=useState<Preference|null>(null);const [loading,setLoading]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [saved,setSaved]=useState(false);
  useEffect(()=>{if(!supabase||!user||mode!=='cloud')return;let live=true;setLoading(true);setError('');
    void withRequestDeadline(()=>supabase!.rpc('get_agenda_email_preference')).then(({data,error})=>{if(!live)return;if(error)throw error;setPreference(data as Preference);}).catch(()=>{if(live)setError('Email preferences are not available yet. Finish the email setup in the project README.');}).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[user?.id,mode]);
  async function toggle(){if(!preference)return;setBusy(true);setError('');setSaved(false);try{const {data,error}=await withRequestDeadline(()=>supabase!.rpc('set_agenda_email_preference',{email_enabled:!preference.enabled}));if(error)throw error;setPreference(data as Preference);setSaved(true);}catch(e){setError((e as Error).message||'Could not save your email preference. Try again.');}finally{setBusy(false)}}
  return <section className="email-alert-option" aria-label="Email notifications"><div className="email-alert-heading"><Mail size={17}/><b>Email updates</b>{preference&&<span>{preference.enabled?'Opted in':'Off'}</span>}</div>{!user||mode!=='cloud'?<p>Sign in to a shared workspace to receive agenda summaries by email.</p>:<><p>Send a little update to <strong>{user.email}</strong> when your partner adds shared agendas—even when the website is closed.</p><p className="email-alert-privacy">One summary per bulk import. Private notes and journals stay out of emails.</p>{loading?<span className="email-alert-status"><LoaderCircle size={13} className="spin"/>Checking your preference…</span>:preference&&<><button className="button" disabled={busy||(!preference.enabled&&!user.email_confirmed_at)} onClick={toggle}>{busy?<LoaderCircle size={14} className="spin"/>:<Mail size={14}/>} {preference.enabled?'Turn off email alerts':'Enable email alerts'}</button>{!user.email_confirmed_at&&!preference.enabled&&<p>Confirm your account email before enabling delivery.</p>}{preference.test_mode&&<p className="email-delivery-pending">Test mode: only the Resend account’s email address can receive alerts. Other recipients are skipped until full delivery is configured.</p>}{!preference.delivery_ready&&<p className="email-delivery-pending">Email delivery isn’t connected yet. Your preference will be kept while setup is completed.</p>}</>}{saved&&<p role="status">{preference?.enabled?'Your email preference is saved.':'Email alerts are turned off.'}</p>}{error&&<p className="email-preference-error" role="alert">{error}</p>}</>}</section>;
}
