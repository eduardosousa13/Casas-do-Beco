import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import Stripe from 'stripe';
import { startCheckout, type CheckoutDependencies } from '../pms/checkout';
import { processStripeEvent } from '../pms/webhook';
import { readBody, readJson } from '../pms/http';

test('checkout: server price, normalisation, failures and early webhooks', async () => {
  const db = new PGlite();
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { BOOKINGS_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_fake', PUBLIC_SITE_URL: 'http://localhost:3004', STRIPE_LIVE_ALLOWED: 'false' });
    const dir = new URL('../pms/migrations/', import.meta.url);
    for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, dir), 'utf8'));
    await db.query(`INSERT INTO booking_policies (version,terms_pt,terms_en,cancellation_pt,cancellation_en,privacy_url,active)
      VALUES ('test','Development test terms only','Development test terms only','Development cancellation only','Development cancellation only','http://localhost/privacy',true)`);
    for (const mode of ['success', 'invalid', 'network', 'early-paid', 'early-expired', 'changed-price']) {
      const house = randomUUID(), room = randomUUID();
      await db.query("INSERT INTO houses(id,slug,name,status) VALUES ($1,$2,'Test','active')", [house, house]);
      await db.query("INSERT INTO rooms(id,house_id,slug,name,status,max_adults,max_occupancy) VALUES ($1,$2,'test','Test','active',2,2)", [room, house]);
      await db.query("INSERT INTO nightly_rates(room_id,stay_date,amount_cents) VALUES ($1,'2030-06-01',10000)", [room]);
      let calls = 0;
      const dependencies: CheckoutDependencies = { db, runTransaction: work => db.transaction(work),
        createSession: async (params, options) => {
          calls++;
          assert.equal(params.customer_email, 'guest@example.com');
          assert.equal(params.line_items?.[0].price_data?.unit_amount, 10000);
          assert.equal(options.idempotencyKey, `casas-do-beco-reservation-${params.client_reference_id}`);
          if (mode === 'invalid') throw new Stripe.errors.StripeInvalidRequestError({ message: 'test failure' });
          if (mode === 'network') throw new Stripe.errors.StripeConnectionError({ message: 'test timeout' });
          const session = { id: `cs_${room}`, client_reference_id: params.client_reference_id, payment_status: 'paid',
            amount_total: 10000, currency: 'eur', payment_intent: `pi_${room}`, url: 'https://checkout.stripe.com/test-only' } as Stripe.Checkout.Session;
          if (mode.startsWith('early-')) await db.transaction(tx => processStripeEvent(tx, {
            id: `evt_${room}`, type: mode === 'early-paid' ? 'checkout.session.completed' : 'checkout.session.expired',
            data: { object: session },
          } as Stripe.Event));
          return session;
        } };
      const request = startCheckout({ stay: { roomId: room, checkIn: '2030-06-01', checkOut: '2030-06-02', adults: 1, children: 0 },
        guest: { name: ' Test Guest ', email: ' Guest@Example.com ', locale: 'pt' },
        policyVersion: 'test', termsAccepted: true, privacyAcknowledged: true,
        expectedQuote: { accommodationCents: mode === 'changed-price' ? 9000 : 10000, paymentDueCents: 10000, paymentPolicy: 'full', depositPercent: null },
      }, 'http://localhost:3004', dependencies);
      if (['invalid','network','changed-price'].includes(mode)) await assert.rejects(request); else await request;
      const reservations = (await db.query<{status: string}>('SELECT status FROM reservations WHERE room_id = $1', [room])).rows;
      if (mode === 'changed-price') { assert.equal(calls, 0); assert.equal(reservations.length, 0); continue; }
      assert.equal(reservations[0].status, { success: 'awaiting_payment', invalid: 'expired', network: 'pending_checkout', 'early-paid': 'confirmed', 'early-expired': 'expired' }[mode]);
      const nights = (await db.query<{n: number}>('SELECT count(*)::int AS n FROM inventory_nights WHERE room_id = $1', [room])).rows[0].n;
      assert.equal(nights, ['invalid','early-expired'].includes(mode) ? 0 : 1);
      if (mode === 'early-paid' || mode === 'early-expired') {
        const payment = (await db.query<{status: string}>('SELECT status FROM payments WHERE provider_checkout_session_id = $1', [`cs_${room}`])).rows[0];
        assert.equal(payment.status, mode === 'early-paid' ? 'paid' : 'failed');
      }
    }
  } finally { process.env = saved; await db.close(); }
});

test('HTTP parser rejects oversized and malformed bodies', async () => {
  await assert.rejects(readBody(new Request('http://localhost', { method: 'POST', body: '123456' }), 5), /demasiado longo/);
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' })), /Dados inválidos/);
});

test('public checkout retries reuse the reservation and exact provider parameters',async()=>{
 const db=new PGlite(),saved={...process.env};
 try{
 Object.assign(process.env,{BOOKINGS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_fake',PUBLIC_SITE_URL:'http://localhost:3004',STRIPE_LIVE_ALLOWED:'false'});
 const dir=new URL('../pms/migrations/',import.meta.url);for(const f of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(f,dir),'utf8'));
 const house=randomUUID(),room=randomUUID();await db.query("INSERT INTO houses(id,slug,name,status) VALUES($1,$2,'Test','active')",[house,house]);await db.query("INSERT INTO rooms(id,house_id,slug,name,status,max_adults,max_occupancy) VALUES($1,$2,'room','Test','active',2,2)",[room,house]);await db.query("INSERT INTO nightly_rates(room_id,stay_date,amount_cents) VALUES($1,'2030-06-01',10000)",[room]);await db.query("INSERT INTO booking_policies(version,active,terms_pt,terms_en,cancellation_pt,cancellation_en,privacy_url) VALUES('test',true,'Development conditions only','Development conditions only','Development cancellation only','Development cancellation only','https://example.com/privacy')");
 const input={requestKey:randomUUID(),stay:{roomId:room,checkIn:'2030-06-01',checkOut:'2030-06-02',adults:1,children:0},guest:{name:'Test Guest',email:'guest@example.com',locale:'pt' as const},policyVersion:'test',termsAccepted:true,privacyAcknowledged:true,expectedQuote:{accommodationCents:10000,paymentDueCents:10000,paymentPolicy:'full' as const,depositPercent:null}};
 const calls:unknown[]=[];const deps:CheckoutDependencies={db,runTransaction:fn=>db.transaction(fn),createSession:async(params,options)=>{calls.push({params,options});if(calls.length===1)throw new Stripe.errors.StripeConnectionError({message:'Lost provider response'});return {id:'cs_retry',url:'https://checkout.stripe.com/test-only'} as Stripe.Checkout.Session;}};
 await assert.rejects(startCheckout(input,'http://localhost:3004',deps));const result=await startCheckout(input,'http://localhost:3004',deps);assert.ok(result.checkoutUrl);assert.deepEqual(calls[0],calls[1]);assert.equal((await db.query('SELECT * FROM reservations')).rows.length,1);assert.equal((await db.query('SELECT * FROM inventory_nights')).rows.length,1);
 // A later definitive response cannot prove that the first ambiguous request never created a session.
 await db.query("UPDATE reservations SET status='pending_checkout',stripe_checkout_session_id=NULL");
 await assert.rejects(startCheckout(input,'http://localhost:3004',{...deps,createSession:async()=>{throw new Stripe.errors.StripeAuthenticationError({message:'Changed test credentials'});}}));
 assert.equal((await db.query<{status:string}>('SELECT status FROM reservations')).rows[0].status,'payment_review');assert.equal((await db.query('SELECT * FROM inventory_nights')).rows.length,1);
 await assert.rejects(startCheckout({...input,guest:{...input.guest,name:'Changed guest'}},'http://localhost:3004',deps),/alterado/);
 }finally{process.env=saved;await db.close();}
});
