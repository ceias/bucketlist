import { EmailPreferences } from './EmailPreferences';
import { useEffect, useState } from 'react';
import { Bell, Heart, X, CheckCheck, ArrowUpRight, LoaderCircle, BellRing } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth';
import { useData } from '../stores/data';
import { useNotices, type PartnerNotice } from '../stores/notifications';
import { useCalendar } from '../stores/calendar';
import { useWindows } from '../stores/windows';

function openNotice(notice:PartnerNotice) {
  const record=useData.getState().items.find(i=>i.id===notice.record_id);
  if(record?.date)useCalendar.getState().select(record.date);
  useWindows.getState().open(notice.app_kind);
  void useNotices.getState().markRead(notice.id);
  useNotices.getState().dismissToast();
}
export function usePartnerNotifications() {
  const user=useAuth(s=>s.session?.user.id);const workspace=useData(s=>s.workspace);
  useEffect(()=>{
    useNotices.getState().reset();if(!user||!workspace||!supabase)return;
    let live=true;const load=(announce=true)=>{if(live)void useNotices.getState().load(user,workspace,announce)};load(false);
    const channel=supabase.channel('partner-notices-'+user).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'recipient_id=eq.'+user},payload=>{
      if(!live)return;const notice=payload.new as PartnerNotice;if(notice.workspace_id!==workspace)return;
      const isNew=!useNotices.getState().notices.some(n=>n.id===notice.id);useNotices.getState().receive(notice);
      if(isNew&&notice.recipient_id===user&&notice.actor_id!==user&&'Notification' in window&&Notification.permission==='granted'&&localStorage.getItem('gio-me-desktop-alerts:'+user)==='yes'&&document.hidden){try{const alert=new Notification(notice.title,{body:notice.message,tag:notice.id,icon:'/assets/decorations/flower.svg'});alert.onclick=()=>{window.focus();openNotice(notice);alert.close()}}catch{/* In-app alerts stay available when this browser cannot display desktop notifications. */}}
    }).subscribe();
    const refresh=()=>{if(document.visibilityState==='visible')load()};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    const interval=setInterval(()=>{if(document.visibilityState==='visible')load()},30000);
    return()=>{live=false;clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);void supabase!.removeChannel(channel);useNotices.getState().reset()};
  },[user,workspace]);
}
export function PartnerNotificationPanel({ onClose }: { onClose:()=>void }) {
  const {notices,error,loading,markRead}=useNotices();const user=useAuth(s=>s.session?.user.id);const mode=useData(s=>s.mode);const unread=notices.filter(n=>!n.read_at).length;
  const [permission,setPermission]=useState('Notification' in window?Notification.permission:'unsupported');const [enabled,setEnabled]=useState(!!user&&localStorage.getItem('gio-me-desktop-alerts:'+user)==='yes');useEffect(()=>{setEnabled(!!user&&localStorage.getItem('gio-me-desktop-alerts:'+user)==='yes')},[user]);
  return <aside className="notification-panel partner-notification-panel" aria-label="Partner notifications"><div className="section-heading"><div><span className="eyebrow">A LITTLE UPDATE FROM YOUR PERSON</span><h2><Bell size={18}/>Love, lately.</h2></div><button className="icon-button" aria-label="Close notifications" onClick={onClose}><X size={17}/></button></div><div className="notification-feed-toolbar"><span>{unread?`${unread} unread`:'All caught up'}</span><button disabled={!unread} onClick={()=>void markRead()}><CheckCheck size={13}/>Mark all read</button></div>
    {loading&&!notices.length&&<p className="notification-empty"><LoaderCircle size={16} className="spin"/>Opening your little updates…</p>}
    {error&&<div className="notification-setup-message" role="alert"><p>We couldn’t load your shared updates.</p><small>{error}</small><p>If notifications haven’t been set up yet, apply the new migration in your Supabase project using the README instructions.</p></div>}
    <div className="partner-notice-list">{notices.map(notice=><button key={notice.id} className={`partner-notice ${notice.read_at?'':'unread'}`} onClick={()=>{openNotice(notice);onClose()}}><span className="partner-notice-icon"><Heart size={17}/></span><span><b>{notice.title}</b><p>{notice.message}</p><small>{formatDistanceToNow(new Date(notice.created_at),{addSuffix:true})}{!notice.read_at&&<i/>}</small></span><ArrowUpRight size={14}/></button>)}</div>
    {!loading&&!error&&!notices.length&&<div className="notification-empty"><img src="/assets/notebook/love-letter.svg" alt=""/><h3>A little quiet, for now.</h3><p>{mode==='cloud'?'When your partner adds shared goals, dates or calendar plans, their updates will land right here—even if you were away.':'Shared partner updates need a connected Supabase workspace.'}</p></div>}
    <EmailPreferences/><div className="desktop-alert-option"><BellRing size={16}/><div><b>Desktop alerts</b><p>{permission==='granted'?(enabled?'On in this browser. Alerts appear while the site is open in another tab.':'Allowed in this browser. Enable alerts to see them while the site is open in another tab.'):permission==='denied'?'Blocked in browser settings. You can still read updates here.':permission==='unsupported'?'This browser does not support desktop alerts here.':'Let a little update find you while this website is open in another tab.'}</p></div>{(permission==='default'||permission==='granted')&&user&&<button className="button" onClick={async()=>{const result=permission==='granted'?'granted':await Notification.requestPermission();setPermission(result);if(result==='granted'){localStorage.setItem('gio-me-desktop-alerts:'+user,enabled?'no':'yes');setEnabled(!enabled)}}}>{enabled?'Pause':'Enable'}</button>}</div><p className="notification-delivery-note">History stays in your account. Desktop alerts require an open website; closed-site push is not connected. Email updates have their own opt-in and delivery setup above.</p>
  </aside>;
}
export function PartnerNotificationToast() {
  const toast=useNotices(s=>s.toast);const dismiss=useNotices(s=>s.dismissToast);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(dismiss,9000);return()=>clearTimeout(timer)},[toast?.id]);
  if(!toast)return null;
  return <div className="partner-update-toast" role="status"><span><Heart size={20}/></span><button className="partner-toast-content" onClick={()=>openNotice(toast)}><b>{toast.title}</b><p>{toast.message}</p><small>See our little plans<ArrowUpRight size={12}/></small></button><button className="icon-button" aria-label="Dismiss partner update" onClick={dismiss}><X size={15}/></button></div>;
}
