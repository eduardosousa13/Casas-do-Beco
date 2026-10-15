import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import type { Sql } from './core';

function key() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Authentication email is not configured');
  return Buffer.from(hkdfSync('sha256',secret,'casas-do-beco','auth-email-jobs-v1',32));
}
function encrypt(value: object) {
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key(),iv);
  const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');
}
function decrypt(value: string) {
  const bytes=Buffer.from(value,'base64'), cipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));
  cipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8')) as {to:string;url:string};
}
export function recoveryMailConfigured() {
  const port=Number(process.env.SMTP_PORT || '465');
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && Number.isInteger(port) && port>0 && port<65536);
}
export async function queueRecoveryEmail(db: Sql, user: {id:string;email:string}, token: string) {
  const staff=await db.query("SELECT 1 FROM pms_staff WHERE user_id=$1 AND enabled AND role='owner'",[user.id]);
  if (!staff.rows.length) return;
  const url=new URL('/admin/reset-password',process.env.PUBLIC_SITE_URL!);
  url.hash=new URLSearchParams({token}).toString();
  await db.query("INSERT INTO auth_email_jobs(id,user_id,payload,expires_at) VALUES ($1,$2,$3,now()+interval '15 minutes')",[randomUUID(),user.id,encrypt({to:user.email,url:url.href})]);
}
export async function completePasswordRecovery(db: Sql, userId: string) {
  await db.query('DELETE FROM pms_auth_session WHERE "userId"=$1',[userId]);
  await db.query("DELETE FROM pms_auth_verification WHERE value=$1 AND (identifier LIKE 'reset-password:%' OR identifier LIKE 'trust-device-%' OR identifier LIKE '2fa-%')",[userId]);
  await db.query("UPDATE auth_email_jobs SET status='cancelled',payload=NULL,completed_at=now() WHERE user_id=$1 AND status='queued'",[userId]);
  await db.query("INSERT INTO audit_log(actor,action,entity_type,entity_id) VALUES ($1,'password.recovered','staff',$1)",[userId]);
}
type Delivery = (message: {to:string;url:string;id:string})=>Promise<void>;
// Caller holds a transaction. SKIP LOCKED permits workers to coexist; a crash
// rolls back the attempt. A send followed by a lost commit can repeat the email.
export async function deliverRecoveryEmail(db: Sql, send: Delivery) {
  await db.query("UPDATE auth_email_jobs SET status='expired',payload=NULL,completed_at=now() WHERE status='queued' AND expires_at<=now()");
  const result=await db.query("SELECT j.* FROM auth_email_jobs j WHERE status='queued' AND available_at<=now() ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1");
  const job=result.rows[0];
  if (!job) return false;
  const staff=await db.query("SELECT 1 FROM pms_staff WHERE user_id=$1 AND enabled AND role='owner'",[job.user_id]);
  if (!staff.rows.length) {
    await db.query("UPDATE auth_email_jobs SET status='cancelled',payload=NULL,completed_at=now() WHERE id=$1",[job.id]);
    return true;
  }
  try {
    await send({...decrypt(String(job.payload)),id:String(job.id)});
    await db.query("UPDATE auth_email_jobs SET status='sent',payload=NULL,attempts=attempts+1,completed_at=now() WHERE id=$1",[job.id]);
  } catch {
    // Do not persist provider errors: they can contain recipients or reset links.
    const attempts=Number(job.attempts)+1;
    await db.query(`UPDATE auth_email_jobs SET attempts=$2, status=CASE WHEN $2>=5 THEN 'failed' ELSE 'queued' END,
      payload=CASE WHEN $2>=5 THEN NULL ELSE payload END,
      completed_at=CASE WHEN $2>=5 THEN now() ELSE NULL END,
      available_at=now()+($3::int*interval '1 second') WHERE id=$1`,[job.id,attempts,30*2**(attempts-1)]);
  }
  return true;
}
export const sendRecoveryEmail: Delivery = async message => {
  if (!recoveryMailConfigured()) throw new Error('Recovery email unavailable');
  const port=Number(process.env.SMTP_PORT || '465');
  const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  try {
    const info=await transport.sendMail({from:process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,to:message.to,
      messageId:`<${message.id}@${new URL(process.env.PUBLIC_SITE_URL!).hostname}>`,
      subject:'Casas do Beco — recuperar acesso à gestão',
      text:`Foi pedida a recuperação da palavra-passe da sua conta administrativa.\n\nAbra esta ligação para escolher uma nova palavra-passe:\n${message.url}\n\nA ligação é de uso único e expira 15 minutos após o pedido. O segundo fator mantém-se obrigatório.\nSe não fez este pedido, ignore esta mensagem. Nunca partilhe a ligação.`,
      disableFileAccess:true,disableUrlAccess:true});
    if (!info.accepted?.length || info.rejected?.length) throw new Error('Recovery email rejected');
  } finally { transport.close(); }
};
