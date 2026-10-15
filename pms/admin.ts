import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createBlock } from './core';
import { saveConfiguration } from './configuration';
import { database, transaction } from './db';

const [command, ...args] = process.argv.slice(2);
const actor = process.env.PMS_ADMIN_ACTOR || process.env.USER || 'local-admin';

function required(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function date(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error('Expected YYYY-MM-DD date');
  }
  return value;
}

function integer(value: string | undefined, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`Expected integer ${min}..${max}`);
  return number;
}

function cents(value: string | undefined): number {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Expected EUR amount such as 95.00');
  const [euros, fraction = ''] = value.split('.');
  const amount = Number(euros) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000) throw new Error('Rate out of range');
  return amount;
}

async function audit(action: string, entityType: string, entityId: string, details: object = {}) {
  await database().query(`INSERT INTO audit_log (actor, action, entity_type, entity_id, details)
    VALUES ($1,$2,$3,$4,$5::jsonb)`, [actor, action, entityType, entityId, JSON.stringify(details)]);
}

async function main() {
  if (command === 'configure-file') {
    const input=JSON.parse(await readFile(required(args[0], 'configuration file'), 'utf8'));
    await transaction(db=>saveConfiguration(db,actor,input));
    console.log('Technical configuration saved.');
  } else if (command === 'init-houses') {
    for (const [slug, name] of [['nascente', 'Casa Nascente'], ['poente', 'Casa Poente']]) {
      const result = await database().query(`INSERT INTO houses (id, slug, name)
        VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING RETURNING id`, [randomUUID(), slug, name]);
      if (result.rows[0]) await audit('create', 'house', String(result.rows[0].id), { slug });
    }
    console.log('Houses are present as drafts; no rooms or rates were invented.');
  } else if (command === 'add-room') {
    const [houseSlug, slug, name, adultsArg, childrenArg, occupancyArg] = args;
    if (!/^[a-z0-9-]+$/.test(required(slug, 'room slug'))) throw new Error('Invalid room slug');
    const adults = integer(adultsArg, 1, 20);
    const children = integer(childrenArg, 0, 20);
    const occupancy = integer(occupancyArg, 1, adults + children);
    const id = randomUUID();
    const result = await database().query(`INSERT INTO rooms
      (id, house_id, slug, name, max_adults, max_children, max_occupancy)
      SELECT $1,id,$3,$4,$5,$6,$7 FROM houses WHERE slug = $2 RETURNING id`,
      [id, required(houseSlug, 'house slug'), slug, required(name, 'room name'), adults, children, occupancy]);
    if (!result.rowCount) throw new Error('House not found');
    await audit('create', 'room', id, { houseSlug, slug });
    console.log(`Created draft room ${id}`);
  } else if (command === 'activate-house' || command === 'activate-room') {
    const isHouse = command === 'activate-house';
    const table = isHouse ? 'houses' : 'rooms';
    const column = isHouse ? 'slug' : 'id';
    const id = required(args[0], isHouse ? 'house slug' : 'room ID');
    const result = await database().query(`UPDATE ${table} SET status = 'active', revision = revision + 1, updated_at = now()
      WHERE ${column} = $1 AND status = 'draft' RETURNING id`, [id]);
    if (!result.rowCount) throw new Error('Draft house/room not found');
    await audit('activate', isHouse ? 'house' : 'room', String(result.rows[0].id));
    console.log('Activated.');
  } else if (command === 'set-rate') {
    const [roomId, dateArg, amountArg] = args;
    const stayDate = date(dateArg);
    const amount = cents(amountArg);
    await database().query(`INSERT INTO nightly_rates (room_id, stay_date, amount_cents)
      VALUES ($1,$2,$3) ON CONFLICT (room_id, stay_date) DO UPDATE
      SET amount_cents = EXCLUDED.amount_cents, updated_at = now()`,
      [required(roomId, 'room ID'), stayDate, amount]);
    await audit('set_rate', 'room', roomId, { stayDate, amountCents: amount });
    console.log('Nightly rate saved.');
  } else if (command === 'set-rate-range') {
    const [roomId, fromArg, untilArg, amountArg] = args;
    const from = date(fromArg);
    const until = date(untilArg);
    if (until <= from) throw new Error('End date must follow start date');
    const amount = cents(amountArg);
    const result = await database().query(`INSERT INTO nightly_rates (room_id, stay_date, amount_cents)
      SELECT $1, d.stay_date::date, $4 FROM generate_series($2::date, $3::date - 1, interval '1 day') d(stay_date)
      ON CONFLICT (room_id, stay_date) DO UPDATE
      SET amount_cents = EXCLUDED.amount_cents, updated_at = now()`,
      [required(roomId, 'room ID'), from, until, amount]);
    await audit('set_rate_range', 'room', roomId, { from, until, amountCents: amount });
    console.log(`${result.rowCount} nightly rates saved.`);
  } else if (command === 'set-payment-policy') {
    const [roomId, policy, percentArg] = args;
    if (!['full', 'deposit', 'pay_later'].includes(policy)) throw new Error('Expected full, deposit or pay_later');
    const percent = policy === 'deposit' ? integer(percentArg, 1, 99) : null;
    const result = await database().query(`UPDATE rooms SET payment_policy = $2, deposit_percent = $3, revision = revision + 1,
      updated_at = now() WHERE id = $1 RETURNING id`, [required(roomId, 'room ID'), policy, percent]);
    if (!result.rowCount) throw new Error('Room not found');
    await audit('set_payment_policy', 'room', roomId, { policy, percent });
    console.log('Payment policy saved.');
  } else if (command === 'set-room-rules') {
    const [roomId, minArg, maxArg, adultsArg, childrenArg, occupancyArg] = args;
    const minNights = integer(minArg, 1, 365);
    const maxNights = integer(maxArg, minNights, 365);
    const adults = integer(adultsArg, 1, 20);
    const children = integer(childrenArg, 0, 20);
    const occupancy = integer(occupancyArg, 1, adults + children);
    const result = await database().query(`UPDATE rooms SET min_nights = $2, max_nights = $3,
      max_adults = $4, max_children = $5, max_occupancy = $6, revision = revision + 1, updated_at = now()
      WHERE id = $1 RETURNING id`, [required(roomId, 'room ID'), minNights, maxNights, adults, children, occupancy]);
    if (!result.rowCount) throw new Error('Room not found');
    await audit('set_room_rules', 'room', roomId, { minNights, maxNights, adults, children, occupancy });
    console.log('Room rules saved.');
  } else if (command === 'set-rate-closure') {
    const [roomId, dayArg, arrivalArg, departureArg] = args;
    const day = date(dayArg);
    if (!['true', 'false'].includes(arrivalArg) || !['true', 'false'].includes(departureArg)) {
      throw new Error('Closure values must be true or false');
    }
    const result = await database().query(`UPDATE nightly_rates
      SET closed_to_arrival = $3, closed_to_departure = $4, updated_at = now()
      WHERE room_id = $1 AND stay_date = $2 RETURNING room_id`,
      [required(roomId, 'room ID'), day, arrivalArg === 'true', departureArg === 'true']);
    if (!result.rowCount) throw new Error('Set the rate for this date first');
    await audit('set_rate_closure', 'room', roomId, { day, closedToArrival: arrivalArg, closedToDeparture: departureArg });
    console.log('Arrival/departure restrictions saved.');
  } else if (command === 'add-policy') {
    const content = JSON.parse(await readFile(required(args[0], 'policy JSON path'), 'utf8'));
    const keys = ['version', 'terms_pt', 'terms_en', 'cancellation_pt', 'cancellation_en', 'privacy_url'];
    if (keys.some(key => typeof content[key] !== 'string')) throw new Error(`Policy JSON needs: ${keys.join(', ')}`);
    await database().query(`INSERT INTO booking_policies
      (version, terms_pt, terms_en, cancellation_pt, cancellation_en, privacy_url)
      VALUES ($1,$2,$3,$4,$5,$6)`, keys.map(key => content[key]));
    await audit('create', 'booking_policy', content.version);
    console.log('Policy saved as inactive draft.');
  } else if (command === 'activate-policy') {
    const version = required(args[0], 'policy version');
    await transaction(async db => {
      await db.query(`UPDATE booking_policies SET active = false WHERE active = true`);
      const result = await db.query(`UPDATE booking_policies SET active = true
        WHERE version = $1 RETURNING version`, [version]);
      if (!result.rowCount) throw new Error('Policy version not found');
      await db.query(`INSERT INTO audit_log (actor, action, entity_type, entity_id)
        VALUES ($1,'activate','booking_policy',$2)`, [actor, version]);
    });
    console.log('Policy activated.');
  } else if (command === 'block') {
    const [roomId, from, until, ...words] = args;
    const id = await transaction(db => createBlock(db, required(roomId, 'room ID'), date(from),
      date(until), required(words.join(' '), 'reason'), actor));
    console.log(`Availability block ${id}`);
  } else if (command === 'unblock') {
    const blockId = required(args[0], 'block ID');
    await transaction(async db => {
      await db.query('DELETE FROM inventory_nights WHERE block_id = $1', [blockId]);
      const result = await db.query('DELETE FROM availability_blocks WHERE id = $1 RETURNING id', [blockId]);
      if (!result.rowCount) throw new Error('Block not found');
      await db.query(`INSERT INTO audit_log (actor, action, entity_type, entity_id)
        VALUES ($1,'delete','availability_block',$2)`, [actor, blockId]);
    });
    console.log('Block removed.');
  } else if (command === 'reservations') {
    const result = await database().query(`SELECT id, room_id, check_in, check_out, status,
      guest_name, guest_email, total_cents, payment_due_cents, created_at
      FROM reservations ORDER BY created_at DESC LIMIT 100`);
    console.table(result.rows);
  } else if (command === 'cancel-reservation') {
    const reservationId = required(args[0], 'reservation ID');
    const reason = required(args.slice(1).join(' '), 'cancellation reason');
    await transaction(async db => {
      const result = await db.query<{ status: string }>(
        'SELECT status FROM reservations WHERE id = $1 FOR UPDATE', [reservationId]);
      if (!result.rows[0] || !['confirmed', 'payment_review'].includes(result.rows[0].status)) {
        throw new Error('Only confirmed/review reservations can be cancelled here');
      }
      const payments = await db.query<{ outstanding_cents: string }>(`SELECT
        coalesce(sum(CASE WHEN status IN ('paid','partially_refunded','refunded','review')
          THEN amount_cents - refunded_cents ELSE 0 END), 0)::bigint::text AS outstanding_cents
        FROM payments WHERE reservation_id = $1`, [reservationId]);
      if (Number(payments.rows[0].outstanding_cents) > 0) {
        throw new Error('Payment remains: refund/reconcile in Stripe before cancelling');
      }
      await db.query('DELETE FROM inventory_nights WHERE reservation_id = $1', [reservationId]);
      await db.query(`UPDATE reservations SET status = 'cancelled', cancelled_at = now(),
        cancellation_reason = $2, updated_at = now() WHERE id = $1`, [reservationId, reason]);
      await db.query(`INSERT INTO audit_log (actor, action, entity_type, entity_id, details)
        VALUES ($1,'cancel','reservation',$2,$3::jsonb)`, [actor, reservationId, JSON.stringify({ reason })]);
    });
    console.log('Reservation cancelled; nights released.');
  } else if (command === 'check-in' || command === 'check-out') {
    const reservationId = required(args[0], 'reservation ID');
    const from = command === 'check-in' ? 'confirmed' : 'checked_in';
    const to = command === 'check-in' ? 'checked_in' : 'checked_out';
    const result = await database().query(`UPDATE reservations SET status = $3, updated_at = now()
      WHERE id = $1 AND status = $2 RETURNING id`, [reservationId, from, to]);
    if (!result.rowCount) throw new Error(`Reservation must be ${from}`);
    await audit(to, 'reservation', reservationId);
    console.log(`Reservation marked ${to}.`);
  } else if (command === 'stale-holds') {
    const result = await database().query(`SELECT id, status, hold_expires_at, stripe_checkout_session_id
      FROM reservations WHERE status IN ('pending_checkout','awaiting_payment')
      AND hold_expires_at < now() ORDER BY hold_expires_at`);
    console.table(result.rows);
    console.log('Holds stay locked until Stripe confirms expiry or an administrator reconciles them.');
  } else {
    console.log(`Commands:
  configure-file <JSON-file>  (validated technical configuration)
  init-houses
  add-room <house-slug> <room-slug> <name> <max-adults> <max-children> <max-occupancy>
  activate-house <house-slug>
  activate-room <room-id>
  set-rate <room-id> <YYYY-MM-DD> <EUR>
  set-rate-range <room-id> <from> <until-exclusive> <EUR>
  set-payment-policy <room-id> <full|deposit|pay_later> [deposit-percent]
  set-room-rules <room-id> <min-nights> <max-nights> <max-adults> <max-children> <max-occupancy>
  set-rate-closure <room-id> <date> <closed-to-arrival:true|false> <closed-to-departure:true|false>
  add-policy <JSON-file>
  activate-policy <version>
  block <room-id> <from> <until-exclusive> <reason>
  unblock <block-id>
  reservations
  cancel-reservation <reservation-id> <reason>  (only after full refund/reconciliation)
  check-in <reservation-id>
  check-out <reservation-id>
  stale-holds`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (process.env.DATABASE_URL) await database().end().catch(() => undefined);
}
