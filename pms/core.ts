import { randomUUID } from 'node:crypto';

export type Sql = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number | null }>;
};

export class PmsError extends Error {
  constructor(public code: 'invalid' | 'unavailable' | 'not_configured' | 'conflict', message: string) {
    super(message);
  }
}

export type Stay = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  babies?: number;
};

export type Quote = Stay & {
  nights: number;
  accommodationCents: number;
  currency: 'EUR';
  paymentPolicy: 'full' | 'deposit' | 'pay_later';
  depositPercent: number | null;
  paymentDueCents: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dayNumber(value: string): number {
  if (!datePattern.test(value)) throw new PmsError('invalid', 'Data inválida.');
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) {
    throw new PmsError('invalid', 'Data inválida.');
  }
  return ms / 86_400_000;
}

export function validateStay(stay: Stay): number {
  if (!stay || typeof stay !== 'object') throw new PmsError('invalid', 'Estadia inválida.');
  if (typeof stay.roomId !== 'string' || !uuidPattern.test(stay.roomId)) throw new PmsError('invalid', 'Quarto inválido.');
  if (typeof stay.checkIn !== 'string' || typeof stay.checkOut !== 'string') throw new PmsError('invalid', 'Data inválida.');
  const nights = dayNumber(stay.checkOut) - dayNumber(stay.checkIn);
  if (nights < 1 || nights > 365) throw new PmsError('invalid', 'Período inválido.');
  if (!Number.isInteger(stay.adults) || stay.adults < 1 || stay.adults > 20 ||
      !Number.isInteger(stay.children) || stay.children < 0 || stay.children > 20 ||
      !Number.isInteger(stay.babies ?? 0) || (stay.babies ?? 0) < 0 || (stay.babies ?? 0) > 10) {
    throw new PmsError('invalid', 'Número de hóspedes inválido.');
  }
  return nights;
}

export async function quoteStay(db: Sql, stay: Stay, today: string): Promise<Quote> {
  const nights = validateStay(stay);
  dayNumber(today);
  if (stay.checkIn < today) throw new PmsError('invalid', 'A entrada tem de ser hoje ou mais tarde.');

  const room = await db.query<{
    house_status: string; room_status: string; max_adults: number; max_children: number;
    max_occupancy: number; max_babies: number; min_nights: number; max_nights: number;
    payment_policy: Quote['paymentPolicy']; deposit_percent: number | null;
  }>(`SELECT h.status AS house_status, r.status AS room_status, r.max_adults,
              r.max_children, r.max_babies, r.max_occupancy, r.min_nights, r.max_nights,
              r.payment_policy, r.deposit_percent
         FROM rooms r JOIN houses h ON h.id = r.house_id WHERE r.id = $1`, [stay.roomId]);
  const config = room.rows[0];
  if (!config || config.room_status !== 'active' || config.house_status !== 'active') {
    throw new PmsError('unavailable', 'Esta unidade ainda não está disponível.');
  }
  if (stay.adults > config.max_adults || stay.children > config.max_children || (stay.babies ?? 0) > config.max_babies ||
      stay.adults + stay.children + (stay.babies ?? 0) > config.max_occupancy) {
    throw new PmsError('invalid', 'O número de hóspedes excede a capacidade.');
  }
  if (nights < config.min_nights || nights > config.max_nights) {
    throw new PmsError('invalid', 'A duração da estadia não é permitida.');
  }

  const result = await db.query<{
    rated_nights: number; total_cents: string; blocked_nights: number;
    closed_to_arrival: boolean | null; closed_to_departure: boolean | null;
  }>(`SELECT count(n.amount_cents)::int AS rated_nights,
              coalesce(sum(n.amount_cents), 0)::bigint::text AS total_cents,
              (SELECT count(*)::int FROM inventory_nights i
                WHERE i.room_id = $1 AND i.stay_date >= $2::date AND i.stay_date < $3::date) AS blocked_nights,
              (SELECT closed_to_arrival FROM nightly_rates WHERE room_id = $1 AND stay_date = $2::date) AS closed_to_arrival,
              (SELECT closed_to_departure FROM nightly_rates WHERE room_id = $1 AND stay_date = $3::date) AS closed_to_departure
         FROM generate_series($2::date, $3::date - 1, interval '1 day') d(stay_date)
         LEFT JOIN nightly_rates n ON n.room_id = $1 AND n.stay_date = d.stay_date::date`,
    [stay.roomId, stay.checkIn, stay.checkOut]);
  const row = result.rows[0];
  if (!row || row.blocked_nights > 0) throw new PmsError('unavailable', 'As datas não estão livres.');
  if (row.rated_nights !== nights) throw new PmsError('not_configured', 'Ainda não há preços para todas as noites.');
  if (row.closed_to_arrival || row.closed_to_departure) {
    throw new PmsError('unavailable', 'A entrada ou saída não está disponível nestas datas.');
  }
  const accommodationCents = Number(row.total_cents);
  if (!Number.isSafeInteger(accommodationCents) || accommodationCents <= 0 || accommodationCents > 2_147_483_647) {
    throw new PmsError('not_configured', 'Preço inválido.');
  }
  const paymentDueCents = config.payment_policy === 'full' ? accommodationCents
    : config.payment_policy === 'deposit' ? Math.ceil(accommodationCents * config.deposit_percent! / 100)
      : 0;
  return { roomId: stay.roomId, checkIn: stay.checkIn, checkOut: stay.checkOut,
    adults: stay.adults, children: stay.children, babies: stay.babies ?? 0, nights, accommodationCents, currency: 'EUR',
    paymentPolicy: config.payment_policy, depositPercent: config.deposit_percent, paymentDueCents };
}

export type Guest = {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  notes?: string;
  locale: 'pt' | 'en';
};

export function validateGuest(guest: Guest): Guest {
  if (!guest || typeof guest !== 'object') throw new PmsError('invalid', 'Dados do hóspede inválidos.');
  if (typeof guest.name !== 'string' || typeof guest.email !== 'string' ||
      (guest.phone !== undefined && typeof guest.phone !== 'string') ||
      (guest.countryCode !== undefined && typeof guest.countryCode !== 'string') ||
      (guest.notes !== undefined && typeof guest.notes !== 'string')) {
    throw new PmsError('invalid', 'Dados do hóspede inválidos.');
  }
  const name = guest.name?.trim();
  const email = guest.email?.trim().toLowerCase();
  const phone = guest.phone?.trim() || undefined;
  const countryCode = guest.countryCode?.trim().toUpperCase() || undefined;
  const notes = guest.notes?.trim() || undefined;
  if (!name || name.length < 2 || name.length > 160 || /[\x00-\x1f]/.test(name) ||
      !email || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
      (phone && (phone.length > 40 || /[\x00-\x1f]/.test(phone))) ||
      (countryCode && !/^[A-Z]{2}$/.test(countryCode)) ||
      (notes && (notes.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(notes))) ||
      !['pt', 'en'].includes(guest.locale)) {
    throw new PmsError('invalid', 'Dados do hóspede inválidos.');
  }
  return { name, email, phone, countryCode, notes, locale: guest.locale };
}

export type NewReservation = {
  stay: Stay;
  guest: Guest;
  policySnapshot: Record<string, unknown>;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  expectedQuote?: Pick<Quote, 'accommodationCents' | 'paymentDueCents' | 'paymentPolicy' | 'depositPercent'>;
};

// Call inside a database transaction. The primary key on inventory_nights is the
// final guard against two simultaneous reservations for the same room and night.
export async function createPendingReservation(db: Sql, input: NewReservation, today: string, holdUntil: Date): Promise<{ id: string; quote: Quote }> {
  validateStay(input.stay);
  const guest = validateGuest(input.guest);
  if (input.termsAccepted !== true || input.privacyAcknowledged !== true ||
      !input.policySnapshot || Object.keys(input.policySnapshot).length === 0) {
    throw new PmsError('invalid', 'É necessário aceitar as condições da reserva e reconhecer a política de privacidade.');
  }
  await db.query(`SELECT r.id FROM rooms r JOIN houses h ON h.id = r.house_id
    WHERE r.id = $1 FOR SHARE OF r,h`, [input.stay.roomId]);
  await db.query(`SELECT stay_date FROM nightly_rates WHERE room_id = $1
    AND stay_date >= $2::date AND stay_date <= $3::date FOR SHARE`,
    [input.stay.roomId, input.stay.checkIn, input.stay.checkOut]);
  const quote = await quoteStay(db, input.stay, today);
  if (quote.paymentDueCents <= 0) throw new PmsError('not_configured', 'Esta unidade não tem pagamento online configurado.');
  if (quote.paymentDueCents < 50) throw new PmsError('not_configured', 'O valor a pagar é inferior ao mínimo do pagamento online.');
  if (input.expectedQuote && (
    input.expectedQuote.accommodationCents !== quote.accommodationCents ||
    input.expectedQuote.paymentDueCents !== quote.paymentDueCents ||
    input.expectedQuote.paymentPolicy !== quote.paymentPolicy ||
    input.expectedQuote.depositPercent !== quote.depositPercent
  )) throw new PmsError('conflict', 'O preço ou a forma de pagamento mudou. Consulta novamente antes de aceitar.');
  if (!Number.isFinite(holdUntil.getTime()) || holdUntil.getTime() <= Date.now()) {
    throw new PmsError('invalid', 'Prazo da reserva inválido.');
  }
  const id = randomUUID();
  await db.query(`INSERT INTO reservations
      (id, room_id, check_in, check_out, adults, children, guest_name, guest_email,
       guest_phone, guest_country_code, guest_notes, locale, source, status,
       accommodation_cents, total_cents, payment_due_cents, payment_policy,
       policy_snapshot, hold_expires_at, terms_accepted_at, privacy_acknowledged_at, babies)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'direct','pending_checkout',
             $13,$13,$14,$15,$16::jsonb,$17,now(),now(),$18)`,
    [id, quote.roomId, quote.checkIn, quote.checkOut, quote.adults, quote.children,
      guest.name, guest.email, guest.phone ?? null, guest.countryCode ?? null,
      guest.notes ?? null, guest.locale, quote.accommodationCents, quote.paymentDueCents,
      quote.paymentPolicy, JSON.stringify(input.policySnapshot), holdUntil.toISOString(), quote.babies ?? 0]);
  try {
    const occupied = await db.query<{ stay_date: string }>(`INSERT INTO inventory_nights
        (room_id, stay_date, reservation_id, rate_cents)
       SELECT $1, d.stay_date::date, $4,
              (SELECT amount_cents FROM nightly_rates
                WHERE room_id = $1 AND stay_date = d.stay_date::date)
         FROM generate_series($2::date, $3::date - 1, interval '1 day') d(stay_date)
       RETURNING stay_date`, [quote.roomId, quote.checkIn, quote.checkOut, id]);
    if (occupied.rows.length !== quote.nights) throw new PmsError('conflict', 'Não foi possível bloquear todas as noites.');
    const snapshot = await db.query<{ total_cents: string }>(`SELECT coalesce(sum(rate_cents), 0)::bigint::text AS total_cents
      FROM inventory_nights WHERE reservation_id = $1`, [id]);
    if (Number(snapshot.rows[0].total_cents) !== quote.accommodationCents) {
      throw new PmsError('conflict', 'O preço foi atualizado durante a reserva. Consulta novamente.');
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new PmsError('conflict', 'Estas datas acabaram de ser reservadas.');
    }
    throw error;
  }
  return { id, quote };
}

export async function createBlock(db: Sql, roomId: string, checkIn: string, checkOut: string, reason: string, actor: string): Promise<string> {
  const nights = dayNumber(checkOut) - dayNumber(checkIn);
  if (!uuidPattern.test(roomId) || nights < 1 || nights > 365 || reason.trim().length < 2 || reason.length > 500 || !actor.trim()) {
    throw new PmsError('invalid', 'Bloqueio inválido.');
  }
  const id = randomUUID();
  await db.query(`INSERT INTO availability_blocks (id, room_id, check_in, check_out, reason, created_by)
                  VALUES ($1,$2,$3,$4,$5,$6)`, [id, roomId, checkIn, checkOut, reason.trim(), actor]);
  try {
    await db.query(`INSERT INTO inventory_nights (room_id, stay_date, block_id)
      SELECT $1, d.stay_date::date, $4
      FROM generate_series($2::date, $3::date - 1, interval '1 day') d(stay_date)`,
      [roomId, checkIn, checkOut, id]);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new PmsError('conflict', 'Já existe uma reserva ou bloqueio nestas datas.');
    }
    throw error;
  }
  await db.query(`INSERT INTO audit_log (actor, action, entity_type, entity_id, details)
                  VALUES ($1,'create','availability_block',$2,$3::jsonb)`, [actor, id, JSON.stringify({ roomId, checkIn, checkOut, reason })]);
  return id;
}
