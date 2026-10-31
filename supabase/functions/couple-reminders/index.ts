import { createClient } from 'npm:@supabase/supabase-js@2.80.0';
import { authorized, deliver, publicAppUrl, type EmailJob, type Outcome } from '../agenda-email/core.ts';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
Deno.serve(async request=>{
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const secret=Deno.env.get('EMAIL_WORKER_SECRET')||'';
  if(!await authorized(request.headers.get('Authorization'),secret))return json({error:'Unauthorized'},401);
  const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('AGENDA_EMAIL_FROM'),appUrl=Deno.env.get('APP_URL');
  const mode=Deno.env.get('EMAIL_DELIVERY_MODE')||'test',testRecipient=Deno.env.get('EMAIL_TEST_RECIPIENT');
  if(mode!=='test'&&mode!=='production')return json({error:'Invalid email delivery mode'},503);
  if(mode==='test'&&(!testRecipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient)))return json({error:'Set your Resend account email as EMAIL_TEST_RECIPIENT'},503);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!apiKey||!from||!appUrl||!supabaseUrl||!serviceKey)return json({error:'Email delivery is not configured'},503);
  try{publicAppUrl(appUrl);if(/[\r\n]/.test(from)||mode==='production'&&from.toLowerCase().includes('@resend.dev'))throw Error();}catch{return json({error:'Check sender and public website settings'},503);}
  const client=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10_000)})}});
  const {data,error}=await client.rpc('claim_couple_reminder_emails');
  if(error)return json({error:'Could not claim delivery jobs'},503);
  const counts={sent:0,retry:0,failed:0,skipped:0,unconfirmed:0};
  for(const job of (data||[]) as EmailJob[]) {
    try {
      const {data:eligible,error:checkError}=await client.rpc('couple_reminder_eligible',{job:job.job_id,token:job.token,expected_email:job.recipient_email});
      if(checkError){counts.unconfirmed++;continue;}
      const result:Outcome=eligible?await deliver(job,{apiKey,from,appUrl,mode,testRecipient}):{outcome:'skipped' as const,code:'recipient_ineligible'};
      const {error:finishError}=await client.rpc('finish_couple_reminder',{job:job.job_id,token:job.token,outcome:result.outcome,provider_id:result.providerId||null,failure_code:result.code||null});
      if(finishError)counts.unconfirmed++;else counts[result.outcome]++;
    }catch{counts.unconfirmed++;}
  }
  // Never log recipient addresses, provider response bodies, API keys or worker secrets.
  return json(counts);
});
