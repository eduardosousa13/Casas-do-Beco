import { randomUUID } from 'node:crypto';
import {deliverEmail,EmailDeliveryError} from '../server/email';
import type { Sql } from './core';
export type MailKind='confirmation'|'changed'|'cancelled'|'payment'|'refund';
const euro=(v:unknown)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(Number(v)/100);
export async function queueReservationEmail(db:Sql,id:string,kind:MailKind,eventKey:string,link?:string) {
  const r=(await db.query(`SELECT r.id,r.guest_email,r.guest_name,r.locale,r.check_in,r.check_out,r.total_cents,r.status,r.settlement_cents,q.name AS room_name,h.name AS house_name FROM reservations r JOIN rooms q ON q.id=r.room_id JOIN houses h ON h.id=q.house_id WHERE r.id=$1`,[id])).rows[0];
  if(!r) return;
  const en=r.locale==='en';
  const names={confirmation:en?'Reservation confirmed':'Reserva confirmada',changed:en?'Reservation updated':'Reserva alterada',cancelled:en?'Reservation cancelled':'Reserva cancelada',payment:link?(en?'Payment request':'Pedido de pagamento'):(en?'Payment confirmed':'Pagamento confirmado'),refund:en?'Refund completed':'Reembolso concluído'};
  const subject=`Casas do Beco — ${names[kind]}`;
  const body=`${en?'Hello':'Olá'} ${r.guest_name},\n\n${names[kind]}.\n${en?'Reference':'Referência'}: ${id}\n${r.house_name} — ${r.room_name}\n${r.check_in} → ${r.check_out}\n${en?'Agreed total':'Total acordado'}: ${euro(r.total_cents)}\n${kind==='cancelled'?(en?'Refunds are processed separately.':'Os reembolsos são processados separadamente.')+'\n':''}${link?'\n'+(en?'Secure payment link':'Ligação de pagamento segura')+': '+link+'\n':''}\n${en?'For any questions, please contact the accommodation.':'Para qualquer questão, contacte o alojamento.'}`;
  await db.query(`INSERT INTO reservation_emails(id,reservation_id,kind,event_key,recipient,subject,body) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_key) DO NOTHING`,[randomUUID(),id,kind,eventKey,String(r.guest_email),subject,body]);
}
export async function deliverReservationEmail(db:Sql,send:(job:Record<string,unknown>)=>Promise<void>) {
  const job=(await db.query(`SELECT * FROM reservation_emails WHERE status='queued' AND available_at<=now() ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
  if(!job) return false;
  try {await send(job);await db.query(`UPDATE reservation_emails SET status='sent',attempts=attempts+1,completed_at=now() WHERE id=$1`,[job.id]);}
  catch(error) {await db.query(`UPDATE reservation_emails SET attempts=attempts+1,status=CASE WHEN attempts+1>=5 THEN 'failed' ELSE 'queued' END,available_at=now()+GREATEST(30*power(2,LEAST(attempts,4))::int,$2::int)*interval '1 second' WHERE id=$1`,[job.id,error instanceof EmailDeliveryError?error.retryAfterSeconds:0]);}
  return true;
}
export async function sendReservationEmail(job:Record<string,unknown>) {
  await deliverEmail({to:String(job.recipient),subject:String(job.subject),text:String(job.body),idempotencyKey:'reservation/'+String(job.id)});
}
