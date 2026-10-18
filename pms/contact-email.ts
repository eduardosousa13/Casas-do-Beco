import {randomUUID} from 'node:crypto';
import type {Sql} from './core';
import {validateContact,type ContactMessage} from '../server/contact';
import {sendContactEmail} from '../server/send-contact';
import {EmailDeliveryError} from '../server/email';

export async function queueContactMessage(db:Sql,message:ContactMessage,recipient=process.env.CONTACT_TO_EMAIL||'casasdobecoladoeiro@gmail.com'){
  const valid=validateContact(message);
  if(!valid)throw Error('Invalid contact message');
  const id=randomUUID();
  await db.query(`INSERT INTO contact_messages(id,name,email,phone,subject,message,notification_recipient) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,valid.nome,valid.email,valid.telefone,valid.casa,valid.mensagem,recipient]);
  return id;
}
type ContactDelivery=(message:ContactMessage,options:{id:string;recipient:string})=>Promise<void>;
// The caller owns the transaction; a failed provider call retains the intake.
export async function deliverContactEmail(db:Sql,send:ContactDelivery=sendContactEmail){
  const job=(await db.query(`SELECT * FROM contact_messages WHERE status='queued' AND available_at<=now() ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
  if(!job)return false;
  try{
    await send({nome:String(job.name),email:String(job.email),telefone:String(job.phone),casa:job.subject as ContactMessage['casa'],mensagem:String(job.message)},{id:String(job.id),recipient:String(job.notification_recipient)});
    await db.query("UPDATE contact_messages SET status='sent',attempts=attempts+1,completed_at=now() WHERE id=$1",[job.id]);
  }catch(error){
    const attempts=Number(job.attempts)+1;
    await db.query(`UPDATE contact_messages SET attempts=$2,status=CASE WHEN $2>=5 THEN 'failed' ELSE 'queued' END,
      completed_at=CASE WHEN $2>=5 THEN now() ELSE NULL END,available_at=now()+$3::int*interval '1 second' WHERE id=$1`,[job.id,attempts,Math.max(30*2**Math.min(attempts-1,4),error instanceof EmailDeliveryError?error.retryAfterSeconds:0)]);
  }
  return true;
}
