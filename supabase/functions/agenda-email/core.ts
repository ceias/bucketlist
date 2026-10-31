export type EmailJob = { job_id: string; token: string; notice_id: string; recipient_email: string; recipient_name: string; actor_name: string; item_count: number; app_kind: string };
export type Outcome = { outcome: 'sent'|'retry'|'failed'|'skipped'; providerId?: string; code?: string };
export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!)); }
export function publicAppUrl(input: string) {
  const url = new URL(input);
  if(url.protocol!=='https:' || url.username || url.password || url.hostname==='localhost' || /^127\./.test(url.hostname) || url.hash || url.search)throw Error('APP_URL must be your deployed HTTPS website address.');
  return url.origin;
}
export async function authorized(header:string|null,secret:string) {
  if(secret.length<32 || !header?.startsWith('Bearer '))return false;
  const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [left,right]=await Promise.all([digest(header.slice(7)),digest(secret)]);let different=0;
  for(let i=0;i<left.length;i++)different|=left[i]^right[i];return different===0;
}
export function emailContent(job:EmailJob,appUrl:string) {
  if(!Number.isSafeInteger(job.item_count)||job.item_count<1||!['bucket','calendar','dates'].includes(job.app_kind))throw Error('Invalid email job');
  const url=new URL('/',publicAppUrl(appUrl));url.searchParams.set('app',job.app_kind);
  const actor=job.actor_name.replace(/[\r\n]/g,' ').slice(0,80);
  const subject=`${actor} added ${job.item_count===1?'a new agenda':`${job.item_count} new agendas`} ♡`;
  // No private text, record titles, invitation codes, or account identifiers go into email.
  const text=`Hi ${job.recipient_name},\n\n${subject}\n\nA little more to look forward to, together. Open our little world to see the plans.\n\n${url.href}\n\nWith love,\nGio & Me OS\n\nYou enabled agenda emails in the notification bell. You can turn them off there at any time.`;
  const html=`<!doctype html><html><body style="margin:0;background:#fff3f7;font-family:Arial,sans-serif;color:#805c6a"><div style="max-width:520px;margin:35px auto;padding:32px;background:#fffaf8;border:1px solid #ebcbd7;border-radius:16px"><p style="font-size:11px;letter-spacing:2px;color:#bd8fa2">A LITTLE UPDATE FROM YOUR PERSON</p><h1 style="font-family:Georgia,serif;font-size:28px;font-weight:normal">${escapeHtml(subject)}</h1><p>Hi ${escapeHtml(job.recipient_name)},</p><p style="line-height:1.8">A little more to look forward to, together. Open our little world to see the plans.</p><p style="margin:27px 0"><a href="${escapeHtml(url.href)}" style="display:inline-block;padding:13px 20px;background:#c47f98;color:#fff;text-decoration:none;border-radius:22px">See our little plans ♡</a></p><p style="font-family:Georgia,serif">With love,<br>Gio & Me OS</p><p style="font-size:11px;line-height:1.7;color:#b29aa4">You enabled agenda emails in the notification bell. You can turn them off there at any time.</p></div></body></html>`;
  return {subject,text,html};
}
export async function deliver(job:EmailJob,config:{apiKey:string;from:string;appUrl:string;mode:'test'|'production';testRecipient?:string},fetcher:typeof fetch=fetch):Promise<Outcome> {
  if(config.mode==='test'&&(!config.testRecipient||job.recipient_email.toLowerCase()!==config.testRecipient.trim().toLowerCase()))return {outcome:'skipped',code:'test_recipient_only'};
  const content=emailContent(job,config.appUrl);
  try {
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10_000),headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`gio-agenda/${job.notice_id}`},body:JSON.stringify({from:config.from,to:[job.recipient_email],...content})});
    if(!response.ok)return {outcome:response.status===429||response.status>=500?'retry':'failed',code:`provider_${response.status}`};
    const data=await response.json();if(typeof data.id!=='string')return {outcome:'retry',code:'invalid_provider_response'};
    return {outcome:'sent',providerId:data.id};
  } catch {return {outcome:'retry',code:'provider_unreachable'};}
}
