import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import type { Sql } from './core';
import { transaction } from './db';
import { queueReservationEmail } from './reservation-email';

export function verifyStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  // Keep processing existing payments when new payments are disabled.
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function applyStripeEvent(event: Stripe.Event): Promise<void> {
  await transaction(db => processStripeEvent(db, event));
}

const checkoutEvents = new Set([
  'checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.expired', 'checkout.session.async_payment_failed',
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function lockPayment(db: Sql, paymentIntent: string) {
  // Serialize refunds and checkout even before a payment row exists.
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [paymentIntent]);
}

async function checkoutEvent(db: Sql, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  if(session.metadata?.owner_command) { await balanceEvent(db,event,session); return; }
  const reference = session.metadata?.reservation_id || session.client_reference_id;
  if (!reference || !uuid.test(reference)) return;
  if (session.client_reference_id && session.metadata?.reservation_id &&
      session.client_reference_id !== session.metadata.reservation_id) {
    throw new Error(`Stripe references disagree for session ${session.id}`);
  }
  const paymentIntent = typeof session.payment_intent === 'string'
    ? session.payment_intent : session.payment_intent?.id;
  if (paymentIntent) await lockPayment(db, paymentIntent);
  const found = await db.query<{
    id: string; status: string; payment_due_cents: number; nights: number;
    room_id: string; stripe_checkout_session_id: string | null;
  }>(`SELECT *, (check_out - check_in)::int AS nights FROM reservations WHERE id = $1 FOR UPDATE`, [reference]);
  const reservation = found.rows[0];
  if (!reservation) {
    if (session.metadata?.app === 'casas-do-beco') throw new Error(`Reservation ${reference} not found`);
    return;
  }
  if (reservation.stripe_checkout_session_id && reservation.stripe_checkout_session_id !== session.id) {
    throw new Error(`Stripe session mismatch for reservation ${reference}`);
  }
  await db.query('UPDATE reservations SET stripe_checkout_session_id = $2 WHERE id = $1', [reference, session.id]);

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    if (['pending_checkout', 'awaiting_payment'].includes(reservation.status)) {
      await db.query('DELETE FROM inventory_nights WHERE reservation_id = $1', [reference]);
      await db.query("UPDATE reservations SET status = 'expired', updated_at = now() WHERE id = $1", [reference]);
      await db.query(`UPDATE payments SET status = 'failed', updated_at = now()
        WHERE provider_checkout_session_id = $1 AND status = 'pending'`, [session.id]);
    }
    return;
  }
  if (session.payment_status !== 'paid') return;
  const amount = session.amount_total;
  if (!Number.isSafeInteger(amount) || amount! < 0 || amount! > 2_147_483_647) throw new Error('Invalid Stripe amount');
  const nights = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM inventory_nights i
    JOIN reservations r ON r.id = i.reservation_id
    WHERE r.id = $1 AND i.room_id = r.room_id AND i.stay_date >= r.check_in AND i.stay_date < r.check_out`, [reference]);
  const previous = (await db.query<{ status: string; amount_cents: number; refunded_cents: number }>(
    'SELECT status, amount_cents, refunded_cents FROM payments WHERE provider_checkout_session_id = $1', [session.id])).rows[0];
  if (previous && !['pending', 'failed'].includes(previous.status) && previous.amount_cents !== amount) {
    throw new Error(`Stripe amount changed for session ${session.id}`);
  }
  const refund = paymentIntent ? (await db.query<{ refunded_cents: number }>(
    'SELECT refunded_cents FROM stripe_refund_totals WHERE payment_intent_id = $1', [paymentIntent])).rows[0]?.refunded_cents ?? 0 : 0;
  const refunded = Math.max(refund, previous?.refunded_cents ?? 0);
  const verified = Boolean(paymentIntent) && amount === reservation.payment_due_cents &&
    session.currency === 'eur' && nights.rows[0].count === reservation.nights &&
    ['pending_checkout', 'awaiting_payment', 'confirmed', 'checked_in', 'checked_out'].includes(reservation.status);
  const paymentStatus = refunded > amount! ? 'review'
    : refunded === amount && refunded > 0 ? 'refunded'
      : refunded > 0 ? 'partially_refunded'
        : verified && previous?.status !== 'review' ? 'paid' : 'review';
  await db.query(`INSERT INTO payments
    (id,reservation_id,provider_payment_intent_id,provider_checkout_session_id,status,amount_cents,refunded_cents,paid_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,now())
    ON CONFLICT (provider_checkout_session_id) DO UPDATE SET
      status = EXCLUDED.status, amount_cents = EXCLUDED.amount_cents,
      refunded_cents = EXCLUDED.refunded_cents,
      provider_payment_intent_id = coalesce(EXCLUDED.provider_payment_intent_id, payments.provider_payment_intent_id),
      paid_at = coalesce(payments.paid_at, EXCLUDED.paid_at), updated_at = now()`,
    [randomUUID(), reference, paymentIntent ?? null, session.id, paymentStatus, amount, Math.min(refunded, amount!)]);
  // Never move a checked-in/out or cancelled reservation backwards.
  if (['pending_checkout', 'awaiting_payment', 'expired'].includes(reservation.status)) {
    await db.query('UPDATE reservations SET status = $2, updated_at = now() WHERE id = $1',
      [reference, verified && refunded === 0 ? 'confirmed' : 'payment_review']);
    if(verified && refunded===0) await queueReservationEmail(db,reference,'confirmation','confirmed-'+reference);
  }
}

async function balanceEvent(db:Sql,event:Stripe.Event,session:Stripe.Checkout.Session) {
  const key=session.metadata!.owner_command;
  if(!uuid.test(key)) throw new Error('Invalid command');
  const pi=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
  if(pi) await lockPayment(db,pi);
  // Match command, amount and reservation; never authorize from metadata alone.
  const command=(await db.query('SELECT * FROM payment_commands WHERE id=$1 FOR UPDATE',[key])).rows[0];
  if(!command || command.kind!=='balance') throw new Error('Unknown payment command');
  const r=(await db.query('SELECT * FROM reservations WHERE id=$1 FOR UPDATE',[command.reservation_id])).rows[0];
  if(!r || session.metadata?.reservation_id!==r.id || session.client_reference_id!==r.id || (command.provider_id && command.provider_id!==session.id)) throw new Error('Payment command mismatch');
  if(event.type==='checkout.session.expired' || event.type==='checkout.session.async_payment_failed') {
    await db.query(`UPDATE payment_commands SET status='expired',updated_at=now() WHERE id=$1 AND status IN ('queued','pending')`,[key]);return;
  }
  if(session.payment_status!=='paid') return;
  if(!Number.isSafeInteger(session.amount_total) || Number(session.amount_total)<1) throw new Error('Invalid payment amount');
  const valid=pi && session.currency==='eur' && session.amount_total===command.amount_cents && ['confirmed','checked_in','checked_out'].includes(String(r.status));
  const refund=pi?(await db.query('SELECT refunded_cents FROM stripe_refund_totals WHERE payment_intent_id=$1',[pi])).rows[0]?.refunded_cents??0:0;
  const state=!valid || Number(refund)>Number(session.amount_total)?'review':Number(refund)===session.amount_total?'refunded':Number(refund)>0?'partially_refunded':'paid';
  await db.query(`INSERT INTO payments(id,reservation_id,provider_payment_intent_id,provider_checkout_session_id,command_id,status,amount_cents,refunded_cents,paid_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()) ON CONFLICT(provider_checkout_session_id) DO NOTHING`,[randomUUID(),r.id,pi??null,session.id,key,state,session.amount_total,Math.min(Number(refund),Number(session.amount_total))]);
  await db.query('UPDATE payment_commands SET provider_id=$2,status=$3,updated_at=now() WHERE id=$1',[key,session.id,valid?'succeeded':'review']);
  await db.query('UPDATE reservations SET revision=revision+1,updated_at=now() WHERE id=$1',[r.id]);
  if(valid) await queueReservationEmail(db,String(r.id),'payment','paid-'+key);
}

async function refundEvent(db: Sql, charge: Stripe.Charge) {
  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent || charge.currency !== 'eur') return;
  if (!Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < 0) throw new Error('Invalid refund amount');
  await lockPayment(db, paymentIntent);
  const total = await db.query<{ refunded_cents: number }>(`INSERT INTO stripe_refund_totals (payment_intent_id, refunded_cents)
    VALUES ($1,$2) ON CONFLICT (payment_intent_id) DO UPDATE SET
      refunded_cents = GREATEST(stripe_refund_totals.refunded_cents, EXCLUDED.refunded_cents), updated_at = now()
    RETURNING refunded_cents`, [paymentIntent, charge.amount_refunded]);
  await db.query(`UPDATE payments SET refunded_cents = LEAST(amount_cents, GREATEST(refunded_cents,$2)),
    status = CASE WHEN $2 > amount_cents THEN 'review'
      WHEN GREATEST(refunded_cents,$2) = amount_cents THEN 'refunded'
      WHEN status = 'review' THEN 'review'
      WHEN GREATEST(refunded_cents,$2) > 0 THEN 'partially_refunded' ELSE status END,
    updated_at = now() WHERE provider_payment_intent_id = $1`, [paymentIntent, total.rows[0].refunded_cents]);
}

// Failed processing rolls back the event record so Stripe can safely retry.
export async function processStripeEvent(db: Sql, event: Stripe.Event): Promise<void> {
  const inserted = await db.query(`INSERT INTO stripe_events (event_id,event_type)
    VALUES ($1,$2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`, [event.id, event.type]);
  if (!inserted.rows.length) return;
  if (checkoutEvents.has(event.type)) await checkoutEvent(db, event);
  else if (event.type === 'charge.refunded') await refundEvent(db, event.data.object as Stripe.Charge);
  await db.query('UPDATE stripe_events SET processed_at = now() WHERE event_id = $1', [event.id]);
}
