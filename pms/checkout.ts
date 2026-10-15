import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { createPendingReservation, PmsError, quoteStay, validateGuest, type Guest, type NewReservation, type Stay, type Sql } from './core';
import { database, transaction } from './db';

let stripeClient: Stripe | undefined;
let stripeKey: string | undefined;

function checkoutConfigured(): boolean {
  if (process.env.BOOKINGS_ENABLED !== 'true' || !process.env.STRIPE_WEBHOOK_SECRET) return false;
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!/^(sk|rk)_(test|live)_/.test(key)) return false;
  try {
    const url = new URL(process.env.PUBLIC_SITE_URL || '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
    return !key.includes('_live_') || (process.env.STRIPE_LIVE_ALLOWED === 'true' && url.protocol === 'https:');
  } catch { return false; }
}

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (/^(sk|rk)_live_/.test(key) && process.env.STRIPE_LIVE_ALLOWED !== 'true') {
    throw new Error('Live Stripe keys require STRIPE_LIVE_ALLOWED=true');
  }
  if (!stripeClient || stripeKey !== key) { stripeClient = new Stripe(key); stripeKey = key; }
  return stripeClient;
}

export function todayLisbon(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export async function activePolicy(db: Sql = database()) {
  const result = await db.query<{
    version: string; terms_pt: string; terms_en: string;
    cancellation_pt: string; cancellation_en: string; privacy_url: string;
  }>('SELECT * FROM booking_policies WHERE active = true');
  if (!result.rows[0]) throw new PmsError('not_configured', 'Condições de reserva ainda por configurar.');
  return result.rows[0];
}

export async function publicQuote(stay: Stay, locale: 'pt' | 'en' = 'pt') {
  const [quote, policy] = await Promise.all([quoteStay(database(), stay, todayLisbon()), activePolicy()]);
  return {
    ...quote,
    bookingsEnabled: checkoutConfigured() && quote.paymentDueCents >= 50 &&
      !(policy.version.startsWith('development-') && /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '')),
    policy: {
      version: policy.version,
      terms: locale === 'en' ? policy.terms_en : policy.terms_pt,
      cancellation: locale === 'en' ? policy.cancellation_en : policy.cancellation_pt,
      privacyUrl: policy.privacy_url,
    },
  };
}

export type CheckoutDependencies = {
  db: Sql;
  runTransaction: typeof transaction;
  createSession: (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => Promise<Stripe.Checkout.Session>;
};

export async function startCheckout(input: {
  stay: Stay;
  guest: Guest;
  policyVersion: string;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  expectedQuote: NonNullable<NewReservation['expectedQuote']>;
  requestKey?: string;
}, baseUrl: string, dependencies?: CheckoutDependencies): Promise<{ reservationId: string; checkoutUrl: string }> {
  if (!checkoutConfigured()) throw new PmsError('not_configured', 'Reservas online ainda indisponíveis.');
  const guest = validateGuest(input.guest);
  if (!input.expectedQuote || !Number.isSafeInteger(input.expectedQuote.accommodationCents) ||
      !Number.isSafeInteger(input.expectedQuote.paymentDueCents)) throw new PmsError('invalid', 'É necessário consultar o preço antes de reservar.');
  const stripeApi = dependencies?.createSession ?? ((params, options) => stripe().checkout.sessions.create(params, options));
  const runTransaction = dependencies?.runTransaction ?? transaction;
  const configuredUrl = process.env.PUBLIC_SITE_URL;
  if (!configuredUrl || new URL(configuredUrl).origin !== new URL(baseUrl).origin) {
    throw new PmsError('not_configured', 'Endereço público da reserva por configurar.');
  }
  if (/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '') && new URL(configuredUrl).protocol !== 'https:') {
    throw new PmsError('not_configured', 'Reservas reais exigem HTTPS.');
  }
  const policy = await activePolicy(dependencies?.db);
  if (policy.version.startsWith('development-') && /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '')) {
    throw new PmsError('not_configured', 'As condições de desenvolvimento não podem ser usadas em produção.');
  }
  if (input.policyVersion !== policy.version) throw new PmsError('invalid', 'As condições da reserva foram atualizadas. Volta a consultar o preço.');

  const policySnapshot = {
    version: policy.version,
    terms: guest.locale === 'en' ? policy.terms_en : policy.terms_pt,
    cancellation: guest.locale === 'en' ? policy.cancellation_en : policy.cancellation_pt,
    privacyUrl: policy.privacy_url,
  };
  const pendingInput: NewReservation = {
    stay: input.stay, guest, policySnapshot, expectedQuote: input.expectedQuote,
    termsAccepted: input.termsAccepted, privacyAcknowledged: input.privacyAcknowledged,
  };
  const holdUntil = new Date(Date.now() + 65 * 60_000);
  const requestKey=input.requestKey;
  if(requestKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)) throw new PmsError('invalid','Pedido inválido.');
  const hash=createHash('sha256').update(JSON.stringify({...pendingInput,guest})).digest('hex');
  const pending = await runTransaction(async db => {
    if(requestKey) {
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['checkout-'+requestKey]);
      const saved=(await db.query(`SELECT c.*,r.status FROM public_checkout_requests c JOIN reservations r ON r.id=c.reservation_id WHERE request_key=$1`,[requestKey])).rows[0];
      if(saved) {
        if(saved.payload_hash!==hash || Date.now()-new Date(String(saved.created_at)).getTime()>23*3600000 || ['expired','cancelled','payment_review'].includes(String(saved.status))) throw new PmsError('conflict','O pedido expirou ou foi alterado. Consulte novamente.');
        return {id:String(saved.reservation_id),quote:saved.quote as Awaited<ReturnType<typeof quoteStay>>,reused:true};
      }
    }
    const created=await createPendingReservation(db,pendingInput,todayLisbon(),holdUntil);
    if(requestKey) await db.query('INSERT INTO public_checkout_requests(request_key,payload_hash,reservation_id,quote) VALUES($1,$2,$3,$4::jsonb)',[requestKey,hash,created.id,JSON.stringify(created.quote)]);
    return {...created,reused:false};
  });

  // An uncertain network error can mean Stripe created a session even if the
  // response was lost. Keep the nights locked for webhook/manual reconciliation.
  let session: Stripe.Checkout.Session;
  try {
    let params:Stripe.Checkout.SessionCreateParams={
      mode: 'payment',
      payment_method_types: pending.quote.paymentDueCents >= 50 && pending.quote.paymentDueCents <= 500_000
        ? ['card', 'mb_way'] : ['card'],
      client_reference_id: pending.id,
      customer_email: guest.email,
      locale: guest.locale === 'pt' ? 'pt' : 'en',
      expires_at: Math.floor(Date.now() / 1000) + 45 * 60,
      line_items: [{ price_data: {
        currency: 'eur',
        unit_amount: pending.quote.paymentDueCents,
        product_data: { name: `Estadia ${pending.quote.checkIn}–${pending.quote.checkOut}` },
      }, quantity: 1 }],
      metadata: { reservation_id: pending.id, app: 'casas-do-beco' },
      payment_intent_data: { metadata: { reservation_id: pending.id, app: 'casas-do-beco' } },
      success_url: `${new URL('/reserva/resultado', configuredUrl)}?id=${pending.id}`,
      cancel_url: `${new URL('/reserva/cancelada', configuredUrl)}?id=${pending.id}`,
    };
    if(requestKey) params=await runTransaction(async db=>{
      const saved=(await db.query('SELECT session_params FROM public_checkout_requests WHERE request_key=$1 FOR UPDATE',[requestKey])).rows[0];
      if(saved.session_params) return saved.session_params as Stripe.Checkout.SessionCreateParams;
      await db.query('UPDATE public_checkout_requests SET session_params=$2::jsonb WHERE request_key=$1',[requestKey,JSON.stringify(params)]);return params;
    });
    session = await stripeApi(params, { idempotencyKey: `casas-do-beco-reservation-${pending.id}` });
  } catch (error) {
    // Validation/authentication failures are definitive: Stripe did not create
    // a Checkout Session. Network and server failures are ambiguous, so the
    // hold remains locked for later reconciliation.
    if ((error instanceof Stripe.errors.StripeInvalidRequestError && error.code!=='idempotency_key_in_use') ||
        error instanceof Stripe.errors.StripeAuthenticationError ||
        error instanceof Stripe.errors.StripePermissionError) {
      await runTransaction(async db => {
        if(pending.reused){await db.query("UPDATE reservations SET status='payment_review',revision=revision+1 WHERE id=$1 AND status='pending_checkout' AND stripe_checkout_session_id IS NULL",[pending.id]);return;}
        const expired = await db.query(`UPDATE reservations SET status = 'expired', updated_at = now()
          WHERE id = $1 AND status = 'pending_checkout' AND stripe_checkout_session_id IS NULL RETURNING id`, [pending.id]);
        if (expired.rows.length) await db.query('DELETE FROM inventory_nights WHERE reservation_id = $1', [pending.id]);
      });
    }
    throw error;
  }
  if (!session.url) throw new Error('Stripe Checkout did not return a URL');
  await runTransaction(async db => {
    if(requestKey) await db.query('UPDATE public_checkout_requests SET checkout_url=$2 WHERE request_key=$1',[requestKey,session.url]);
    await db.query(`UPDATE reservations
      SET status = 'awaiting_payment', stripe_checkout_session_id = $2, updated_at = now()
      WHERE id = $1 AND status = 'pending_checkout'`, [pending.id, session.id]);
    await db.query(`INSERT INTO payments
      (id, reservation_id, provider_checkout_session_id, status, amount_cents)
      SELECT $1,$2,$3,CASE WHEN status = 'expired' THEN 'failed' ELSE 'pending' END,$4
      FROM reservations WHERE id = $2
      ON CONFLICT (provider_checkout_session_id) DO NOTHING`,
      [crypto.randomUUID(), pending.id, session.id, pending.quote.paymentDueCents]);
  });
  return { reservationId: pending.id, checkoutUrl: session.url };
}
