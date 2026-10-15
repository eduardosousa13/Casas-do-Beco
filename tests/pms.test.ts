import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type Stripe from 'stripe';
import { createBlock, createPendingReservation, PmsError, quoteStay } from '../pms/core';
import { stripe } from '../pms/checkout';
import { processStripeEvent, verifyStripeEvent } from '../pms/webhook';

const houseId = '8ec5a614-8f5d-45ba-9e3f-c24d1a180001';
const roomId = '8ec5a614-8f5d-45ba-9e3f-c24d1a180002';
const secondRoomId = '8ec5a614-8f5d-45ba-9e3f-c24d1a180003';
const stay = { roomId, checkIn: '2027-06-01', checkOut: '2027-06-03', adults: 2, children: 0 };
const guest = { name: 'Maria Sousa', email: 'maria@example.com', locale: 'pt' as const };

test('PMS schema, quotes, occupancy and blocking', async () => {
  const db = new PGlite();
  try {
    const dir=new URL('../pms/migrations/',import.meta.url);
    for(const file of (await readdir(dir)).filter(file=>file.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file,dir),'utf8'));
    await db.query(`INSERT INTO houses (id,slug,name,status) VALUES ($1,'nascente','Casa Nascente','active')`, [houseId]);
    await db.query(`INSERT INTO rooms (id,house_id,slug,name,status,max_adults,max_occupancy)
                    VALUES ($1,$2,'quarto-1','Quarto de teste','active',2,2)`, [roomId, houseId]);
    await db.query(`INSERT INTO rooms (id,house_id,slug,name,status,max_adults,max_occupancy)
                    VALUES ($1,$2,'quarto-2','Outro quarto','active',2,2)`, [secondRoomId, houseId]);
    await db.query(`INSERT INTO nightly_rates (room_id,stay_date,amount_cents) VALUES
      ($1,'2027-06-01',9500),($1,'2027-06-02',10500),($1,'2027-06-03',10500),($1,'2027-06-04',9999)`, [roomId]);
    await db.query(`INSERT INTO nightly_rates (room_id,stay_date,amount_cents) VALUES
      ($1,'2027-06-01',9000),($1,'2027-06-02',9000)`, [secondRoomId]);

    const quote = await quoteStay(db, stay, '2027-01-01');
    assert.equal(quote.nights, 2);
    assert.equal(quote.accommodationCents, 20_000);
    assert.equal(quote.paymentDueCents, 20_000);
    await assert.rejects(() => quoteStay(db, { ...stay, checkOut: stay.checkIn }, '2027-01-01'),
      (error: unknown) => error instanceof PmsError && error.code === 'invalid');
    await assert.rejects(() => quoteStay(db, { ...stay, adults: 3 }, '2027-01-01'),
      (error: unknown) => error instanceof PmsError && error.code === 'invalid');
    await assert.rejects(() => quoteStay(db, { ...stay, checkOut: '2027-06-06' }, '2027-01-01'),
      (error: unknown) => error instanceof PmsError && error.code === 'not_configured');

    const holdUntil = new Date(Date.now() + 3_600_000);
    const reservation = await db.transaction(tx => createPendingReservation(tx,
      { stay, guest, policySnapshot: { test: true }, termsAccepted: true, privacyAcknowledged: true }, '2027-01-01', holdUntil));
    assert.ok(reservation.id);
    const completed = {
      id: 'evt_test_paid', type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_reservation', client_reference_id: reservation.id,
        payment_status: 'paid', amount_total: 20_000, currency: 'eur', payment_intent: 'pi_test_reservation' } },
    } as unknown as Stripe.Event;
    await db.transaction(tx => processStripeEvent(tx, completed));
    await db.transaction(tx => processStripeEvent(tx, completed));
    const confirmed = await db.query<{ status: string }>('SELECT status FROM reservations WHERE id = $1', [reservation.id]);
    assert.equal(confirmed.rows[0].status, 'confirmed');
    const paymentCount = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM payments WHERE reservation_id = $1', [reservation.id]);
    assert.equal(paymentCount.rows[0].count, 1);
    const staleExpired = { ...completed, id: 'evt_test_expired', type: 'checkout.session.expired' } as Stripe.Event;
    await db.transaction(tx => processStripeEvent(tx, staleExpired));
    await assert.rejects(() => quoteStay(db, stay, '2027-01-01'),
      (error: unknown) => error instanceof PmsError && error.code === 'unavailable');
    const secondRoomQuote = await quoteStay(db, { ...stay, roomId: secondRoomId }, '2027-01-01');
    assert.equal(secondRoomQuote.accommodationCents, 18_000);
    const secondRoomReservation = await db.transaction(tx => createPendingReservation(tx,
      { stay: { ...stay, roomId: secondRoomId }, guest, policySnapshot: { test: true },
        termsAccepted: true, privacyAcknowledged: true }, '2027-01-01', holdUntil));
    const expired = { id: 'evt_second_expired', type: 'checkout.session.expired',
      data: { object: { id: 'cs_second', client_reference_id: secondRoomReservation.id } } } as unknown as Stripe.Event;
    await db.transaction(tx => processStripeEvent(tx, expired));
    const secondRoomAfterExpiry = await quoteStay(db, { ...stay, roomId: secondRoomId }, '2027-01-01');
    assert.equal(secondRoomAfterExpiry.accommodationCents, 18_000);
    await assert.rejects(() => db.transaction(tx => createBlock(tx, roomId,
      '2027-06-02', '2027-06-04', 'Manutenção', 'test')), error => error instanceof PmsError && error.code === 'conflict');
    const overlap = await db.query<{ count: string }>(`SELECT count(*)::text AS count FROM inventory_nights WHERE reservation_id = $1`, [reservation.id]);
    assert.equal(overlap.rows[0].count, '2');
    const freeBlock = await db.transaction(tx => createBlock(tx, roomId,
      '2027-06-03', '2027-06-04', 'Manutenção', 'test'));
    assert.ok(freeBlock);
    await db.query(`UPDATE rooms SET payment_policy = 'deposit', deposit_percent = 30 WHERE id = $1`, [roomId]);
    const depositQuote = await quoteStay(db, { ...stay, checkIn: '2027-06-04', checkOut: '2027-06-05' }, '2027-01-01');
    assert.equal(depositQuote.paymentDueCents, 3000);
    const reviewReservation = await db.transaction(tx => createPendingReservation(tx,
      { stay: { ...stay, checkIn: '2027-06-04', checkOut: '2027-06-05' }, guest,
        policySnapshot: { test: true }, termsAccepted: true, privacyAcknowledged: true }, '2027-01-01', holdUntil));
    const wrongAmount = { id: 'evt_wrong_amount', type: 'checkout.session.completed',
      data: { object: { id: 'cs_wrong_amount', client_reference_id: reviewReservation.id,
        payment_status: 'paid', amount_total: 1, currency: 'eur' } } } as unknown as Stripe.Event;
    await db.transaction(tx => processStripeEvent(tx, wrongAmount));
    const review = await db.query<{ status: string }>('SELECT status FROM reservations WHERE id = $1', [reviewReservation.id]);
    assert.equal(review.rows[0].status, 'payment_review');
  } finally {
    await db.close();
  }
});

test('Stripe webhook requires a valid signature', () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_local_only';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_only';
  const payload = JSON.stringify({ id: 'evt_signed', type: 'test.event', data: { object: {} } });
  const signature = stripe().webhooks.generateTestHeaderString({
    payload, secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  assert.equal(verifyStripeEvent(payload, signature).id, 'evt_signed');
  assert.throws(() => verifyStripeEvent(`${payload}x`, signature));
});
