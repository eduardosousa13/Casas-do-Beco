import Stripe from 'stripe';
import {randomUUID} from 'node:crypto';
import { stripe } from './checkout';
import type { Sql } from './core';
import { processStripeEvent } from './webhook';
import { queueReservationEmail } from './reservation-email';

export function paymentServiceConfigured() {
  const key=process.env.STRIPE_SECRET_KEY||'';
  if(!/^(sk|rk)_(test|live)_/.test(key)) return false;
  if(key.includes('_live_')) {try {return process.env.STRIPE_LIVE_ALLOWED==='true' && new URL(process.env.PUBLIC_SITE_URL||'').protocol==='https:';}catch{return false;}}
  return !!process.env.PUBLIC_SITE_URL;
}
export async function processPaymentCommand(db:Sql,api=stripe()) {
  const c=(await db.query(`SELECT * FROM payment_commands WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
  if(!c) return false;
  // An ambiguous request must not be replayed after Stripe's idempotency window.
  if(Number(c.attempts)>0 && Date.now()-new Date(String(c.created_at)).getTime()>23*3600000) {
    await db.query(`UPDATE payment_commands SET status='review',updated_at=now() WHERE id=$1`,[c.id]);return true;
  }
  const r=(await db.query('SELECT * FROM reservations WHERE id=$1 FOR UPDATE',[c.reservation_id])).rows[0];
  if(!r) throw new Error('Missing reservation');
  try {
    if(c.kind==='balance') {
      if(!['confirmed','checked_in','checked_out'].includes(String(r.status))) throw new Error('Reservation no longer collectible');
      let params=c.session_params as Stripe.Checkout.SessionCreateParams | null;
      if(!params) {params={mode:'payment',customer_email:String(r.guest_email),locale:r.locale==='en'?'en':'pt',client_reference_id:String(r.id),payment_method_types:Number(c.amount_cents)<=500000?['card','mb_way']:['card'],expires_at:Math.floor(Date.now()/1000)+60*60,line_items:[{price_data:{currency:'eur',unit_amount:Number(c.amount_cents),product_data:{name:`Casas do Beco — ${r.check_in} / ${r.check_out}`}},quantity:1}],metadata:{reservation_id:String(r.id),owner_command:String(c.id),app:'casas-do-beco'},payment_intent_data:{metadata:{reservation_id:String(r.id),owner_command:String(c.id),app:'casas-do-beco'}},success_url:new URL('/reserva/resultado',process.env.PUBLIC_SITE_URL).href+'?id='+r.id+'&command='+c.id,cancel_url:new URL('/reserva/cancelada',process.env.PUBLIC_SITE_URL).href+'?id='+r.id+'&command='+c.id};await db.query('UPDATE payment_commands SET session_params=$2::jsonb WHERE id=$1',[c.id,JSON.stringify(params)]);}
      const session=await api.checkout.sessions.create(params,{idempotencyKey:'owner-balance-'+c.id});
      if(!session.url) throw new Error('Missing checkout link');
      await db.query(`UPDATE payment_commands SET status='pending',provider_id=$2,checkout_url=$3,attempts=attempts+1,updated_at=now() WHERE id=$1`,[c.id,session.id,session.url]);
      await queueReservationEmail(db,String(r.id),'payment','balance-'+c.id,session.url);
    } else {
      const p=(await db.query('SELECT * FROM payments WHERE id=$1 AND reservation_id=$2 FOR UPDATE',[c.payment_id,c.reservation_id])).rows[0];
      if(!p?.provider_payment_intent_id) throw new Error('Missing payment');
      const refund=await api.refunds.create({payment_intent:String(p.provider_payment_intent_id),amount:Number(c.amount_cents),reason:'requested_by_customer',metadata:{owner_command:String(c.id),app:'casas-do-beco'}},{idempotencyKey:'owner-refund-'+c.id});
      await db.query(`UPDATE payment_commands SET status=$2,provider_id=$3,attempts=attempts+1,updated_at=now() WHERE id=$1`,[c.id,refund.status==='succeeded'?'succeeded':refund.status==='failed'||refund.status==='canceled'?'failed':'pending',refund.id]);
      await recordRefund(db,p,refund);
      if(refund.status==='succeeded')await queueReservationEmail(db,String(r.id),'refund','refund-'+refund.id);
    }
  } catch(error) {
    const definitive=(error instanceof Stripe.errors.StripeInvalidRequestError && error.code!=='idempotency_key_in_use') || error instanceof Stripe.errors.StripeAuthenticationError || error instanceof Stripe.errors.StripePermissionError;
    await db.query(`UPDATE payment_commands SET attempts=attempts+1,status=$2,updated_at=now() WHERE id=$1`,[c.id,definitive?(Number(c.attempts)>0?'review':'failed'):Number(c.attempts)>=4?'review':'queued']);
  }
  return true;
}
export async function recordRefund(db:Sql,p:Record<string,unknown>,refund:Stripe.Refund) {
  if(refund.currency!=='eur' || !Number.isSafeInteger(refund.amount) || refund.amount<1) throw new Error('Refund mismatch');
  const pi=typeof refund.payment_intent==='string'?refund.payment_intent:refund.payment_intent?.id;
  if(pi!==p.provider_payment_intent_id) throw new Error('Refund payment mismatch');
  await db.query(`INSERT INTO refund_records(provider_id,payment_id,amount_cents,status) VALUES($1,$2,$3,$4) ON CONFLICT(provider_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()`,[refund.id,p.id,refund.amount,refund.status||'pending']);
  // Reconciliation supplies the complete provider list. Do not replace a legacy
  // aggregate with a partial list of newly observed refunds here.
}
export async function reconcilePayment(db:Sql,p:Record<string,unknown>,api=stripe()) {
  const locked=(await db.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE',[p.id])).rows[0];if(!locked?.provider_payment_intent_id)return;
  const intent=await api.paymentIntents.retrieve(String(locked.provider_payment_intent_id),{expand:['latest_charge.balance_transaction']});
  const charge=typeof intent.latest_charge==='object'?intent.latest_charge:null;
  if(!charge || charge.currency!=='eur' || charge.amount!==locked.amount_cents) {await db.query("UPDATE payments SET status='review' WHERE id=$1",[p.id]);return;}
  let total=0,count=0;
  for await(const refund of api.refunds.list({payment_intent:intent.id,limit:100})) {
    if(++count>1000) throw new Error('Refund history requires review');
    await recordRefund(db,locked,refund);if(refund.status==='succeeded')total+=refund.amount;
    const updated=await db.query(`UPDATE payment_commands SET status=$2,updated_at=now() WHERE provider_id=$1 AND kind='refund' AND status<>$2 RETURNING reservation_id,id`,[refund.id,refund.status==='succeeded'?'succeeded':refund.status==='failed'||refund.status==='canceled'?'failed':'pending']);
    if(refund.status==='succeeded' && updated.rows.length) await queueReservationEmail(db,String(p.reservation_id),'refund','refund-'+refund.id);
  }
  const txn=typeof charge.balance_transaction==='object'?charge.balance_transaction:null;
  const status=charge.disputed || total>Number(locked.amount_cents)?'review':total===Number(locked.amount_cents)?'refunded':total>0?'partially_refunded':'paid';
  await db.query('UPDATE payments SET refunded_cents=$2,status=$3,fee_cents=$4,net_cents=$5,method=COALESCE($6,method),updated_at=now() WHERE id=$1',[p.id,Math.min(total,Number(locked.amount_cents)),status,txn?.fee??null,txn?.net??null,charge.payment_method_details?.type??null]);
}
export async function reconcileCheckout(db:Sql,sessionId:string,api=stripe()) {
  const session=await api.checkout.sessions.retrieve(sessionId);
  if(session.status==='open' && session.payment_status!=='paid') return;
  await processStripeEvent(db,{id:`reconcile-${session.id}-${session.status}-${session.payment_status}`,type:session.payment_status==='paid'?'checkout.session.completed':'checkout.session.expired',data:{object:session}} as unknown as Stripe.Event);
}

export async function recoverInitialCheckout(db:Sql,api=stripe()) {
  const saved=(await db.query(`SELECT c.* FROM public_checkout_requests c JOIN reservations r ON r.id=c.reservation_id WHERE r.status='pending_checkout' AND r.stripe_checkout_session_id IS NULL AND c.session_params IS NOT NULL AND c.created_at<now()-interval '1 minute' ORDER BY c.created_at FOR UPDATE OF c SKIP LOCKED LIMIT 1`)).rows[0];
  if(!saved)return false;
  const r=(await db.query('SELECT status FROM reservations WHERE id=$1 FOR UPDATE',[saved.reservation_id])).rows[0];
  if(r.status!=='pending_checkout')return true;
  if(Date.now()-new Date(String(saved.created_at)).getTime()>23*3600000){await db.query("UPDATE reservations SET status='payment_review',revision=revision+1 WHERE id=$1",[saved.reservation_id]);return true;}
  const session=await api.checkout.sessions.create(saved.session_params as Stripe.Checkout.SessionCreateParams,{idempotencyKey:'casas-do-beco-reservation-'+saved.reservation_id});
  if(!session.url)throw Error('Missing checkout link');
  await db.query('UPDATE public_checkout_requests SET checkout_url=$2 WHERE request_key=$1',[saved.request_key,session.url]);
  await db.query("UPDATE reservations SET status='awaiting_payment',stripe_checkout_session_id=$2,revision=revision+1 WHERE id=$1",[saved.reservation_id,session.id]);
  const quote=saved.quote as {paymentDueCents:number};
  await db.query(`INSERT INTO payments(id,reservation_id,provider_checkout_session_id,status,amount_cents) VALUES($1,$2,$3,'pending',$4) ON CONFLICT(provider_checkout_session_id) DO NOTHING`,[randomUUID(),saved.reservation_id,session.id,quote.paymentDueCents]);
  return true;
}
