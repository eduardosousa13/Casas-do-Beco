import {createHash} from 'node:crypto';
import nodemailer from 'nodemailer';

export class EmailNotConfigured extends Error {
  constructor(){super('Email service is not configured');}
}
export class EmailDeliveryError extends Error {
  constructor(public code:'network'|'rate_limit'|'rejected'|'provider',public retryAfterSeconds=0){super('Email delivery failed: '+code);}
}
export type EmailMessage={to:string;subject:string;text:string;replyTo?:string;idempotencyKey:string};
type EmailConfig={provider:'resend'|'smtp';from:string;replyTo?:string;apiKey?:string;host?:string;port?:number;user?:string;password?:string};
const address=(value:string)=>value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)&&!/[\x00-\x1f\x7f]/.test(value);
function sender(value:string){
  if(!value||value.length>320||/[\x00-\x1f\x7f]/.test(value))return false;
  const match=value.match(/^[^<>]+<([^<>]+)>$/);
  return address(match?match[1]:value);
}
export function emailConfiguration(env:NodeJS.ProcessEnv=process.env):EmailConfig|null{
  const provider=env.EMAIL_PROVIDER||'smtp',from=env.EMAIL_FROM||env.SMTP_FROM_EMAIL||env.SMTP_USER||'',replyTo=env.EMAIL_REPLY_TO||undefined;
  if(!sender(from)||(replyTo&&!address(replyTo)))return null;
  if(provider==='resend')return env.RESEND_API_KEY&&!/\s/.test(env.RESEND_API_KEY)?{provider,from,replyTo,apiKey:env.RESEND_API_KEY}:null;
  const port=Number(env.SMTP_PORT||465);
  if(provider!=='smtp'||!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASSWORD||!Number.isInteger(port)||port<1||port>65535)return null;
  return{provider,from,replyTo,host:env.SMTP_HOST,port,user:env.SMTP_USER,password:env.SMTP_PASSWORD};
}
export const emailConfigured=()=>emailConfiguration()!==null;

// One attempt per call. Durable queues own retries; provider bodies/errors must
// never reach logs because they can contain recipients or password-reset URLs.
export async function deliverEmail(message:EmailMessage,options:{env?:NodeJS.ProcessEnv;request?:typeof fetch}={}){
  const config=emailConfiguration(options.env);
  if(!config)throw new EmailNotConfigured();
  if(!address(message.to)||(message.replyTo&&!address(message.replyTo))||!message.subject||message.subject.length>200||/[\x00-\x1f\x7f]/.test(message.subject)||!message.text||message.text.length>100000||!message.idempotencyKey||!/^[a-zA-Z0-9_/-]{1,200}$/.test(message.idempotencyKey))throw new EmailDeliveryError('rejected');
  const replyTo=message.replyTo||config.replyTo;
  if(config.provider==='resend'){
    let response:Response;
    try{
      response=await(options.request||fetch)('https://api.resend.com/emails',{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
        headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json','Idempotency-Key':message.idempotencyKey},
        body:JSON.stringify({from:config.from,to:[message.to],subject:message.subject,text:message.text,...(replyTo?{reply_to:replyTo}:{})}),
      });
    }catch{throw new EmailDeliveryError('network');}
    if(!response.ok){
      const value=response.headers.get('retry-after');
      const wait=value?(Number.isFinite(Number(value))?Number(value):Math.ceil((Date.parse(value)-Date.now())/1000)):60;
      try{await response.body?.cancel();}catch{/* Discard provider bodies without exposing them. */}
      throw new EmailDeliveryError(response.status===429?'rate_limit':response.status>=500?'provider':'rejected',response.status===429?Math.max(30,Math.min(86400,Number.isFinite(wait)?wait:60)):0);
    }
    let data:{id?:unknown}|null;try{data=await response.json();}catch{throw new EmailDeliveryError('provider');}
    if(!data||typeof data.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(data.id))throw new EmailDeliveryError('provider');
    return{provider:'resend' as const,id:data.id};
  }
  const transport=nodemailer.createTransport({host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port!==465,
    auth:{user:config.user,pass:config.password},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  try{
    const domain=(config.from.match(/<([^<>]+)>$/)?.[1]||config.from).split('@')[1];
    const info=await transport.sendMail({from:config.from,to:message.to,replyTo,subject:message.subject,text:message.text,
      messageId:`<casas-${createHash('sha256').update(message.idempotencyKey).digest('hex')}@${domain}>`,disableFileAccess:true,disableUrlAccess:true});
    if(!info.accepted?.length||info.rejected?.length)throw new EmailDeliveryError('rejected');
    return{provider:'smtp' as const,id:String(info.messageId)};
  }catch(error){if(error instanceof EmailDeliveryError)throw error;throw new EmailDeliveryError('provider');}
  finally{transport.close();}
}
