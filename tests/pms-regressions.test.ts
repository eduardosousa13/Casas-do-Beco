import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type Stripe from 'stripe';
import { createPendingReservation, quoteStay } from '../pms/core';
import { processStripeEvent } from '../pms/webhook';

const db = new PGlite();
before(async () => {
  const dir = new URL('../pms/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(file => file.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, dir), 'utf8'));
  }
});
after(() => db.close());

async function fixture() {
  const house = randomUUID();
  const room = randomUUID();
  await db.query("INSERT INTO houses (id,slug,name,status) VALUES ($1,$2,'Test house','active')", [house, house]);
  await db.query(`INSERT INTO rooms (id,house_id,slug,name,status,max_adults,max_occupancy)
    VALUES ($1,$2,'test','Test room','active',2,2)`, [room, house]);
  await db.query("INSERT INTO nightly_rates (room_id,stay_date,amount_cents) VALUES ($1,'2030-06-01',10000)", [room]);
  const input = { stay: { roomId: room, checkIn: '2030-06-01', checkOut: '2030-06-02', adults: 2, children: 0 },
    guest: { name: 'Test Guest', email: 'test@example.com', locale: 'pt' as const },
    policySnapshot: { version: 'test' }, termsAccepted: true, privacyAcknowledged: true };
  const reservation = await db.transaction(tx => createPendingReservation(tx, input, '2030-01-01', new Date(Date.now() + 3600000)));
  const session = { id: `cs_${reservation.id}`, client_reference_id: reservation.id,
    payment_status: 'paid', amount_total: 10000, currency: 'eur', payment_intent: `pi_${reservation.id}` };
  const send = (type: string, object: object) => db.transaction(tx => processStripeEvent(tx,
    { id: `evt_${randomUUID()}`, type, data: { object } } as unknown as Stripe.Event));
  const paid = () => send('checkout.session.completed', session);
  const refund = (amount: number) => send('charge.refunded', {
    id: `ch_${reservation.id}`, payment_intent: session.payment_intent, amount: 10000,
    amount_refunded: amount, currency: 'eur', metadata: { reservation_id: reservation.id },
  });
  const payment = async () => (await db.query<{status: string; refunded_cents: number; amount_cents: number}>('SELECT * FROM payments WHERE reservation_id = $1', [reservation.id])).rows[0];
  const status = async () => (await db.query<{status: string}>('SELECT status FROM reservations WHERE id = $1', [reservation.id])).rows[0].status;
  return { ...reservation, room, input, session, send, paid, refund, payment, status };
}

test('a second payment event cannot erase a refund', async () => {
  const f = await fixture();
  await f.paid(); await f.refund(10000); await f.paid();
  assert.equal((await f.payment()).status, 'refunded');
});

test('late payment events preserve check-in and check-out', async () => {
  const f = await fixture(); await f.paid();
  for (const state of ['checked_in', 'checked_out']) {
    await db.query('UPDATE reservations SET status = $2 WHERE id = $1', [f.id, state]);
    await f.paid();
    assert.equal(await f.status(), state);
    assert.equal((await f.payment()).status, 'paid');
  }
});

test('a refund arriving before checkout completion is retained', async () => {
  const f = await fixture(); await f.refund(10000); await f.paid();
  assert.equal((await f.payment()).refunded_cents, 10000);
  assert.equal((await f.payment()).status, 'refunded');
  assert.equal(await f.status(), 'payment_review');
});

test('an older partial refund cannot reduce the recorded refund', async () => {
  const f = await fixture(); await f.paid(); await f.refund(10000); await f.refund(3000);
  assert.equal((await f.payment()).refunded_cents, 10000);
  assert.equal((await f.payment()).status, 'refunded');
});

test('payment review records the amount actually received', async () => {
  const f = await fixture();
  await db.query(`INSERT INTO payments (id,reservation_id,provider_checkout_session_id,status,amount_cents)
    VALUES ($1,$2,$3,'pending',10000)`, [randomUUID(), f.id, f.session.id]);
  await f.send('checkout.session.completed', { ...f.session, amount_total: 15000 });
  assert.equal((await f.payment()).amount_cents, 15000);
  assert.equal((await f.payment()).status, 'review');
});

test('unrelated Stripe Checkout sessions are ignored', async () => {
  const f = await fixture();
  await f.send('checkout.session.completed', { id: 'cs_unrelated', payment_status: 'paid' });
  assert.equal(await f.status(), 'pending_checkout');
});

test('a changed price cannot be charged without a new quote', async () => {
  const f = await fixture();
  await db.query('DELETE FROM inventory_nights WHERE reservation_id = $1', [f.id]);
  const expectedQuote = await quoteStay(db, f.input.stay, '2030-01-01');
  await db.query('UPDATE nightly_rates SET amount_cents = 15000 WHERE room_id = $1', [f.room]);
  await assert.rejects(() => db.transaction(tx => createPendingReservation(tx,
    { ...f.input, expectedQuote }, '2030-01-01', new Date(Date.now() + 3600000))), /preço.*mudou/);
  assert.equal((await db.query<{count: number}>('SELECT count(*)::int AS count FROM reservations WHERE room_id = $1', [f.room])).rows[0].count, 1);
});
