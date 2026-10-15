import { createHash, randomUUID } from 'node:crypto';
import { PmsError, createBlock, quoteStay, validateGuest, validateStay, type Sql, type Stay } from './core';
import { activePolicy, todayLisbon } from './checkout';
import { queueReservationEmail } from './reservation-email';

export const uuid = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new PmsError('invalid','Referência inválida.');
  return value;
};
export function dateValue(value: unknown): string {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+'T00:00:00Z')) || new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value) throw new PmsError('invalid','Data inválida.');
  return value;
}
const number = (value: unknown, max=2147483647) => {
  if(!Number.isSafeInteger(value) || Number(value)<0 || Number(value)>max) throw new PmsError('invalid','Valor inválido.');
  return Number(value);
};
const text = (value: unknown, max: number, required=false) => {
  if(typeof value!=='string' || value.trim().length>max || (required && value.trim().length<2) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new PmsError('invalid','Texto inválido.');
  return value.trim();
};
const states=['pending_checkout','awaiting_payment','confirmed','checked_in','checked_out','cancelled','expired','payment_review'];
const moneySql = `COALESCE((SELECT sum(p.amount_cents-p.refunded_cents) FROM payments p WHERE p.reservation_id=r.id AND p.status IN ('paid','partially_refunded','refunded')),0)::bigint::text`;
const listSql = `SELECT r.id, r.guest_name,r.guest_email,r.guest_phone,r.locale,r.check_in,r.check_out,r.adults,r.children,r.babies,r.status,r.total_cents,r.settlement_cents,r.revision,r.created_at,h.name AS house_name,q.name AS room_name, ${moneySql} AS received_cents,
 EXISTS(SELECT 1 FROM payments p WHERE p.reservation_id=r.id AND p.status='review') AS payment_review
 FROM reservations r JOIN rooms q ON q.id=r.room_id JOIN houses h ON h.id=q.house_id`;
export function financialValues(r: Record<string,unknown>): Record<string,unknown> & {received_cents:number;balance_cents:number;return_due_cents:number} {
  const received=Number(r.received_cents), target=Number(r.settlement_cents ?? r.total_cents);
  return {...r,received_cents:received,balance_cents:Math.max(0,target-received),return_due_cents:Math.max(0,received-target)};
}
export async function ownerRooms(db:Sql) {
  return (await db.query(`SELECT r.id,r.house_id,r.name,h.name AS house_name,r.status,h.status AS house_status,r.max_adults,r.max_children,r.max_babies,r.max_occupancy FROM rooms r JOIN houses h ON h.id=r.house_id ORDER BY h.name,r.name`)).rows;
}
export async function reservationList(db: Sql, params: URLSearchParams) {
  const search=(params.get('search')||'').trim(), status=params.get('status')||'', from=params.get('from')||'', until=params.get('until')||'', house=params.get('house')||'', offset=Number(params.get('offset')||0),payment=params.get('payment')||'';
  if(!['','balance','settled','review','refund'].includes(payment)) throw new PmsError('invalid','Filtro inválido.');
  if(from && until && until<from) throw new PmsError('invalid','Período inválido.');
  if(search.length>160 || (status && !states.includes(status)) || !Number.isSafeInteger(offset) || offset<0 || offset>100000) throw new PmsError('invalid','Filtro inválido.');
  if(from) dateValue(from); if(until) dateValue(until); if(house) uuid(house);
  const rows=(await db.query(`${listSql} WHERE ($1='' OR r.guest_name ILIKE $2 OR r.guest_email ILIKE $2 OR r.guest_phone ILIKE $2 OR r.id::text ILIKE $2)
    AND ($3='' OR r.status=$3) AND ($4='' OR r.check_out>NULLIF($4,'')::date) AND ($5='' OR r.check_in<=NULLIF($5,'')::date)
    AND ($6='' OR q.house_id=NULLIF($6,'')::uuid) AND ($8='' OR ($8='balance' AND r.status IN ('confirmed','checked_in','checked_out') AND (${moneySql})::bigint<r.total_cents)
      OR ($8='settled' AND r.status IN ('confirmed','checked_in','checked_out') AND (${moneySql})::bigint>=r.total_cents)
      OR ($8='review' AND (r.status='payment_review' OR EXISTS(SELECT 1 FROM payments p WHERE p.reservation_id=r.id AND p.status='review')))
      OR ($8='refund' AND EXISTS(SELECT 1 FROM payments p WHERE p.reservation_id=r.id AND p.refunded_cents>0))) ORDER BY r.created_at DESC,r.id DESC LIMIT 41 OFFSET $7`,[search,'%'+search.replace(/[\\%_]/g,'\\$&')+'%',status,from,until,house,offset,payment])).rows;
  return {reservations:rows.slice(0,40).map(financialValues),next:rows.length>40?offset+40:null};
}
export async function reservationDetail(db:Sql,id:string) {
  uuid(id);
  const row=(await db.query(`${listSql} WHERE r.id=$1`,[id])).rows[0];
  if(!row) throw new PmsError('invalid','Reserva não encontrada.');
  const extra=(await db.query(`SELECT room_id,guest_notes,internal_notes,arrival_time,payment_policy,payment_due_cents,policy_snapshot,terms_accepted_at,privacy_acknowledged_at,cancellation_reason,cancelled_at FROM reservations WHERE id=$1`,[id])).rows[0];
  const payments=(await db.query(`SELECT id,status,amount_cents,refunded_cents,method,paid_at,fee_cents,net_cents FROM payments WHERE reservation_id=$1 ORDER BY created_at`,[id])).rows;
  const commands=(await db.query(`SELECT id,kind,amount_cents,status,checkout_url,reason,created_at FROM payment_commands WHERE reservation_id=$1 ORDER BY created_at DESC`,[id])).rows;
  const messages=(await db.query(`SELECT id,kind,status,attempts,created_at,completed_at,recipient FROM reservation_emails WHERE reservation_id=$1 ORDER BY created_at DESC LIMIT 100`,[id])).rows;
  // Only allowlisted human-readable summaries. Never expose raw audit JSON.
  const history=(await db.query(`SELECT a.id::text,a.action,a.created_at,COALESCE(u.name,'Sistema') AS actor_name,a.details->>'summary' AS summary FROM audit_log a LEFT JOIN pms_auth_user u ON u.id=a.actor WHERE entity_type='reservation' AND entity_id=$1 ORDER BY a.id DESC LIMIT 100`,[id])).rows;
  return {reservation:{...financialValues(row),...extra},payments,commands,messages,history};
}
export async function calendarData(db:Sql,month:string,house='') {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new PmsError('invalid','Mês inválido.');
  if(house) uuid(house);
  const start=dateValue(month+'-01');
  const rooms=(await ownerRooms(db)).filter(r=>!house || r.house_id===house);
  const nights=(await db.query(`SELECT i.room_id,i.stay_date,i.reservation_id,i.block_id,b.reason,r.guest_name,r.status FROM inventory_nights i LEFT JOIN reservations r ON r.id=i.reservation_id LEFT JOIN availability_blocks b ON b.id=i.block_id JOIN rooms q ON q.id=i.room_id WHERE stay_date>=$1::date AND stay_date<($1::date+interval '1 month') AND ($2='' OR q.house_id=NULLIF($2,'')::uuid) ORDER BY stay_date`,[start,house])).rows;
  return {rooms,nights};
}
export async function summaryData(db:Sql,today=todayLisbon()) {
  dateValue(today);
  const rows=(await db.query(`${listSql} WHERE r.status IN ('confirmed','checked_in','payment_review') AND r.check_out>=$1::date AND r.check_in<=($1::date+interval '7 days') ORDER BY r.check_in,r.guest_name`,[today])).rows.map(financialValues);
  const recent=(await db.query(`${listSql} WHERE r.status NOT IN ('expired','pending_checkout') ORDER BY r.created_at DESC LIMIT 8`)).rows.map(financialValues);
  const alerts=(await db.query(`SELECT r.id,r.guest_name, 'payment' AS kind FROM reservations r WHERE r.status='payment_review' OR EXISTS(SELECT 1 FROM payments p WHERE p.reservation_id=r.id AND p.status='review')
    UNION ALL SELECT r.id,r.guest_name,'payment' FROM reservations r WHERE r.status='pending_checkout' AND r.created_at<now()-interval '10 minutes'
    UNION ALL SELECT r.id,r.guest_name,'email' FROM reservations r WHERE EXISTS(SELECT 1 FROM reservation_emails e WHERE e.reservation_id=r.id AND e.status='failed')
    UNION ALL SELECT r.id,r.guest_name,'command' FROM reservations r WHERE EXISTS(SELECT 1 FROM payment_commands c WHERE c.reservation_id=r.id AND c.status IN ('failed','review')) LIMIT 50`)).rows;
  return {today,arrivals:rows.filter(r=>r.check_in===today && r.status==='confirmed'),departures:rows.filter(r=>r.check_out===today && r.status==='checked_in'),inHouse:rows.filter(r=>r.status==='checked_in'),upcoming:rows.filter(r=>String(r.check_in)>today),recent,alerts};
}
export async function financeData(db:Sql,from:string,until:string,house='') {
  dateValue(from);dateValue(until);if(house) uuid(house);
  if(until<from || (Date.parse(until)-Date.parse(from))/86400000>366) throw new PmsError('invalid','Escolha um período até um ano.');
  const rows=(await db.query(`${listSql} WHERE r.check_in<=$2::date AND r.check_out>$1::date AND ($3='' OR q.house_id=NULLIF($3,'')::uuid) ORDER BY r.check_in,r.id`,[from,until,house])).rows.map(financialValues);
  const movements=(await db.query(`SELECT p.id,p.reservation_id,r.guest_name,p.status,p.amount_cents,p.refunded_cents,p.paid_at,p.fee_cents,p.net_cents FROM payments p JOIN reservations r ON r.id=p.reservation_id JOIN rooms q ON q.id=r.room_id WHERE p.paid_at>=($1::date AT TIME ZONE 'Europe/Lisbon') AND p.paid_at<(($2::date+1) AT TIME ZONE 'Europe/Lisbon') AND ($3='' OR q.house_id=NULLIF($3,'')::uuid) ORDER BY p.paid_at DESC`,[from,until,house])).rows;
  return {from,until,reservations:rows,movements,totals:{contracted:rows.filter(r=>!['cancelled','expired','pending_checkout','awaiting_payment'].includes(String(r.status))).reduce((a,r)=>a+Number(r.total_cents),0),outstanding:rows.filter(r=>!['expired','pending_checkout','awaiting_payment','payment_review'].includes(String(r.status))).reduce((a,r)=>a+r.balance_cents,0),returnDue:rows.reduce((a,r)=>a+r.return_due_cents,0),received:movements.filter(p=>['paid','refunded','partially_refunded'].includes(String(p.status))).reduce((a,p)=>a+Number(p.amount_cents),0)},invoiced:null,payouts:null};
}
export async function previewStay(db:Sql,input:Record<string,unknown>,today=todayLisbon()) {
  const stay=input.stay as Stay; validateStay(stay);
  if(input.id) {
    const old=(await db.query('SELECT status FROM reservations WHERE id=$1',[uuid(input.id)])).rows[0];
    if(!old || old.status!=='confirmed') throw new PmsError('conflict','Só pode alterar uma reserva confirmada antes da entrada.');
    // Transaction rolls this deletion back for preview. The caller MUST roll back
    // the entire preview, or use a savepoint as below.
    await db.query('SAVEPOINT owner_preview');
    try {await db.query('DELETE FROM inventory_nights WHERE reservation_id=$1',[input.id]);return await quoteStay(db,stay,today);}
    finally {await db.query('ROLLBACK TO SAVEPOINT owner_preview');await db.query('RELEASE SAVEPOINT owner_preview');}
  }
  return quoteStay(db,stay,today);
}
async function audit(db:Sql,actor:string,id:string,action:string,summary:string) {
  await db.query(`INSERT INTO audit_log(actor,action,entity_type,entity_id,details) VALUES ($1,$2,'reservation',$3,$4::jsonb)`,[actor,action,id,JSON.stringify({summary})]);
}
// All mutations run inside a transaction, serialized per request and reservation.
export async function operate(db:Sql,actor:string,input:Record<string,unknown>,today=todayLisbon()) {
  const key=uuid(input.key),action=text(input.action,30,true);
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);
  const prior=(await db.query('SELECT actor,payload_hash,result FROM owner_operations WHERE id=$1',[key])).rows[0];
  if(prior) {if(prior.actor!==actor || prior.payload_hash!==hash) throw new PmsError('conflict','Este pedido já foi usado para outra operação.');return prior.result;}
  let result:Record<string,unknown>={ok:true};
  if(action==='block') {
    const id=await createBlock(db,uuid(input.roomId),dateValue(input.checkIn),dateValue(input.checkOut),text(input.reason,500,true),actor);result={ok:true,id};
  } else if(action==='unblock') {
    const id=uuid(input.id);
    await db.query('SELECT id FROM availability_blocks WHERE id=$1 FOR UPDATE',[id]);
    await db.query('DELETE FROM inventory_nights WHERE block_id=$1',[id]);
    await db.query(`INSERT INTO audit_log(actor,action,entity_type,entity_id) VALUES ($1,'unblock','availability_block',$2)`,[actor,id]);
  } else if(action==='manual') {
    if(input.acknowledged!==true) throw new PmsError('invalid','Confirme que o pagamento ainda não foi recebido.');
    const stay=input.stay as Stay;validateStay(stay);const guest=validateGuest(input.guest as Parameters<typeof validateGuest>[0]);
    await db.query('SELECT r.id FROM rooms r JOIN houses h ON h.id=r.house_id WHERE r.id=$1 FOR SHARE OF r,h',[stay.roomId]);
    await db.query('SELECT stay_date FROM nightly_rates WHERE room_id=$1 AND stay_date BETWEEN $2::date AND $3::date FOR SHARE',[stay.roomId,stay.checkIn,stay.checkOut]);
    const quote=await quoteStay(db,stay,today),policy=await activePolicy(db);
    if(number(input.expectedTotal)!==quote.accommodationCents) throw new PmsError('conflict','O preço mudou. Consulte novamente.');
    const id=randomUUID();
    await db.query(`INSERT INTO reservations(id,room_id,check_in,check_out,adults,children,babies,guest_name,guest_email,guest_phone,guest_notes,locale,source,status,accommodation_cents,total_cents,payment_due_cents,payment_policy,policy_snapshot)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'admin','confirmed',$13,$13,0,'pay_later',$14::jsonb)`,[id,stay.roomId,stay.checkIn,stay.checkOut,stay.adults,stay.children,stay.babies??0,guest.name,guest.email,guest.phone??null,guest.notes??null,guest.locale,quote.accommodationCents,JSON.stringify({version:policy.version,terms:guest.locale==='en'?policy.terms_en:policy.terms_pt,cancellation:guest.locale==='en'?policy.cancellation_en:policy.cancellation_pt,privacyUrl:policy.privacy_url,manual:true})]);
    await occupy(db,id,stay);
    await audit(db,actor,id,'reservation.manual','Reserva manual criada; pagamento por receber.');await queueReservationEmail(db,id,'confirmation',key);result={ok:true,id};
  } else {
    const id=uuid(input.id);
    const r=(await db.query('SELECT * FROM reservations WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!r) throw new PmsError('invalid','Reserva não encontrada.');
    if(number(input.revision)!==r.revision) throw new PmsError('conflict','A reserva mudou. Atualize antes de guardar.');
    const pending=(await db.query(`SELECT 1 FROM payments WHERE reservation_id=$1 AND status IN ('pending','review') UNION ALL SELECT 1 FROM payment_commands WHERE reservation_id=$1 AND status IN ('queued','pending','review')`,[id])).rows.length>0;
    if(['change','cancel'].includes(action) && pending) throw new PmsError('conflict','Existe um pagamento ou reembolso pendente. Aguarde a verificação.');
    if(action==='contact') {
      const guest=validateGuest(input.guest as Parameters<typeof validateGuest>[0]);
      await db.query('UPDATE reservations SET guest_name=$2,guest_email=$3,guest_phone=$4,locale=$5 WHERE id=$1',[id,guest.name,guest.email,guest.phone??null,guest.locale]);
    } else if(action==='note') await db.query('UPDATE reservations SET internal_notes=$2 WHERE id=$1',[id,text(input.note,4000)]);
    else if(action==='checkin' || action==='checkout') {
      if((action==='checkin' && (r.status!=='confirmed' || String(r.check_in)>today || String(r.check_out)<=today)) || (action==='checkout' && r.status!=='checked_in')) throw new PmsError('conflict','Esta ação não está disponível para a estadia.');
      await db.query('UPDATE reservations SET status=$2 WHERE id=$1',[id,action==='checkin'?'checked_in':'checked_out']);
    } else if(action==='cancel') {
      if(!['confirmed','checked_in'].includes(String(r.status))) throw new PmsError('conflict','Esta reserva não pode ser cancelada.');
      const retain=number(input.retainCents);if(retain>Number(r.total_cents)) throw new PmsError('invalid','A retenção não pode exceder o preço contratado.');
      const reason=text(input.reason,500,true);
      await db.query(`UPDATE reservations SET status='cancelled',cancelled_at=now(),cancellation_reason=$2,settlement_cents=$3 WHERE id=$1`,[id,reason,retain]);
      await db.query('DELETE FROM inventory_nights WHERE reservation_id=$1',[id]);await queueReservationEmail(db,id,'cancelled',key);
    } else if(action==='change') {
      if(r.status!=='confirmed') throw new PmsError('conflict','Só pode alterar antes da entrada.');
      const stay=input.stay as Stay;validateStay(stay);
      await db.query('SELECT r.id FROM rooms r JOIN houses h ON h.id=r.house_id WHERE r.id=$1 FOR SHARE OF r,h',[stay.roomId]);
      await db.query('SELECT stay_date FROM nightly_rates WHERE room_id=$1 AND stay_date BETWEEN $2::date AND $3::date FOR SHARE',[stay.roomId,stay.checkIn,stay.checkOut]);
      await db.query('DELETE FROM inventory_nights WHERE reservation_id=$1',[id]);
      const quote=await quoteStay(db,stay,today);
      if(number(input.expectedTotal)!==quote.accommodationCents) throw new PmsError('conflict','O preço mudou. Consulte novamente.');
      if(input.acknowledged!==true) throw new PmsError('invalid','Confirme o novo preço acordado com o hóspede.');
      await occupy(db,id,stay);
      await db.query(`UPDATE reservations SET room_id=$2,check_in=$3,check_out=$4,adults=$5,children=$6,babies=$7,accommodation_cents=$8,total_cents=$8+fees_cents+tax_cents-discount_cents,payment_due_cents=LEAST(payment_due_cents,$8+fees_cents+tax_cents-discount_cents) WHERE id=$1`,[id,stay.roomId,stay.checkIn,stay.checkOut,stay.adults,stay.children,stay.babies??0,quote.accommodationCents]);
      await audit(db,actor,id,'reservation.previous_stay',`Anterior: ${r.check_in} a ${r.check_out}; quarto ${r.room_id}; total ${r.total_cents} cêntimos.`);
      await queueReservationEmail(db,id,'changed',key);
    } else if(action==='retry-email') {
      const emailId=uuid(input.emailId);
      const sent=await db.query(`UPDATE reservation_emails SET status='queued',attempts=0,available_at=now(),completed_at=NULL WHERE id=$1 AND reservation_id=$2 AND status='failed' RETURNING id`,[emailId,id]);
      if(!sent.rows.length) throw new PmsError('conflict','Só pode repetir um envio falhado.');
    } else if(action==='balance' || action==='refund') {
      const amount=number(input.amountCents);if(amount<50 && action==='balance' || amount<1) throw new PmsError('invalid','Montante inválido.');
      if(pending) throw new PmsError('conflict','Existe uma operação financeira pendente.');
      const payments=(await db.query(`SELECT id,status,amount_cents,refunded_cents,provider_payment_intent_id FROM payments WHERE reservation_id=$1 FOR UPDATE`,[id])).rows;
      const received=payments.filter(p=>['paid','refunded','partially_refunded'].includes(String(p.status))).reduce((sum,p)=>sum+Number(p.amount_cents)-Number(p.refunded_cents),0);
      let paymentId:string|null=null;
      if(action==='balance') {if(!['confirmed','checked_in','checked_out'].includes(String(r.status)) || amount>Number(r.total_cents)-received) throw new PmsError('invalid','A cobrança excede o saldo disponível.');}
      else {paymentId=uuid(input.paymentId);const p=payments.find(p=>p.id===paymentId);if(!p || !p.provider_payment_intent_id || !['paid','partially_refunded'].includes(String(p.status)) || amount>Number(p.amount_cents)-Number(p.refunded_cents)) throw new PmsError('invalid','Reembolso indisponível ou superior ao recebido.');}
      const reason=text(input.reason,500,true);
      await db.query(`INSERT INTO payment_commands(id,reservation_id,payment_id,kind,amount_cents,actor,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[key,id,paymentId,action,amount,actor,reason]);result={ok:true,id,queued:true};
    } else throw new PmsError('invalid','Ação inválida.');
    await db.query('UPDATE reservations SET revision=revision+1,updated_at=now() WHERE id=$1',[id]);
    await audit(db,actor,id,'reservation.'+action,action==='cancel'?'Cancelamento registado; acerto financeiro separado.':action==='balance'?'Pedido de ligação de pagamento registado.':action==='refund'?'Pedido de reembolso registado.':'Operação '+action+' registada.');
  }
  await db.query('INSERT INTO owner_operations(id,actor,payload_hash,result) VALUES ($1,$2,$3,$4::jsonb)',[key,actor,hash,JSON.stringify(result)]);
  return result;
}
async function occupy(db:Sql,id:string,stay:Stay) {
  try {await db.query(`INSERT INTO inventory_nights(room_id,stay_date,reservation_id,rate_cents) SELECT $1,d::date,$4,n.amount_cents FROM generate_series($2::date,$3::date-1,interval '1 day') d JOIN nightly_rates n ON n.room_id=$1 AND n.stay_date=d::date`,[stay.roomId,stay.checkIn,stay.checkOut,id]);}
  catch(error) {if(error && typeof error==='object' && 'code' in error && error.code==='23505') throw new PmsError('conflict','Estas datas acabaram de ser ocupadas.');throw error;}
}
export function csvCell(value:unknown) {
  let str=String(value??'');if(/^[\s]*[=+@\-]/.test(str)) str="'"+str;
  return '"'+str.replaceAll('"','""')+'"';
}
