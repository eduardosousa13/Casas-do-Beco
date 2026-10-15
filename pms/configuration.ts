import { randomUUID } from 'node:crypto';
import { PmsError, validateStay, type Sql } from './core';
import { amenities, bedFields, bathrooms, accessTypes } from './room-catalog';

function string(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new PmsError('invalid', `${label}: valor inválido.`);
  }
  return value.trim();
}
function integer(value: unknown, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new PmsError('invalid', `${label}: valor inválido.`);
  return Number(value);
}
function time(value: unknown) {
  if (value === '' || value == null) return null;
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(value)) throw new PmsError('invalid', 'Horário inválido.');
  return value.slice(0, 5);
}
const activeReservation = "status IN ('pending_checkout','awaiting_payment','confirmed','checked_in','payment_review') AND check_out > (now() AT TIME ZONE 'Europe/Lisbon')::date";

export async function configurationList(db: Sql) {
  const houses = await db.query(`SELECT h.*, (SELECT count(*)::int FROM reservations r JOIN rooms rm ON rm.id = r.room_id WHERE rm.house_id = h.id AND ${activeReservation.replace('status IN', 'r.status IN')}) AS future_reservations FROM houses h ORDER BY h.name`);
  const rooms = await db.query(`SELECT rm.*, (SELECT count(*)::int FROM reservations WHERE room_id = rm.id AND ${activeReservation}) AS future_reservations FROM rooms rm ORDER BY rm.name`);
  return { houses: houses.rows, rooms: rooms.rows };
}

// Caller supplies a transaction and an authenticated actor. Never take the actor from JSON.
export async function saveConfiguration(db: Sql, actor: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PmsError('invalid', 'Dados inválidos.');
  const data = input as Record<string, unknown>;
  const entity = data.entity;
  if (entity !== 'house' && entity !== 'room') throw new PmsError('invalid', 'Tipo inválido.');
  const table = entity === 'house' ? 'houses' : 'rooms';
  const id = data.id ? string(data.id, 36, 36, 'ID') : randomUUID();
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) throw new PmsError('invalid', 'ID inválido.');
  const previous = data.id ? (await db.query(`SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`, [id])).rows[0] : null;
  if (data.id && !previous) throw new PmsError('invalid', 'Alojamento não encontrado.');
  if (previous && integer(data.revision, 1, 2147483646, 'Versão') !== previous.revision) throw new PmsError('conflict', 'Outra pessoa alterou este alojamento. Atualize a página antes de guardar.');
  const fields: Record<string, unknown> = {
    name: string(data.name, 2, 120, 'Nome'),
    slug: string(data.slug, 2, 100, 'Endereço'),
    description_pt: string(data.description_pt ?? '', 0, 8000, 'Descrição PT'),
    description_en: string(data.description_en ?? '', 0, 8000, 'Descrição EN'),
  };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(fields.slug))) throw new PmsError('invalid', 'Use letras minúsculas, números e hífen no endereço.');
  const status = data.status ?? 'draft';
  if (!['draft','active','retired'].includes(String(status))) throw new PmsError('invalid', 'Estado inválido.');
  if (!previous && status !== 'draft') throw new PmsError('invalid', 'Crie primeiro como rascunho.');
  fields.status = status;
  let ratePlan: { from: string; until: string; cents: number } | null = null;
  let previousRates: Record<string, unknown>[] = [];
  if (entity === 'house') {
    for (const key of ['address_line1','address_line2','postal_code','locality']) fields[key] = string(data[key] ?? '', 0, 240, key);
  } else {
    fields.house_id = string(data.house_id, 36, 36, 'Casa');
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(String(fields.house_id))) throw new PmsError('invalid', 'Casa inválida.');
    const house = (await db.query('SELECT id, status FROM houses WHERE id = $1 FOR SHARE', [fields.house_id])).rows[0];
    if (!house) throw new PmsError('invalid', 'Casa inválida.');
    if (previous && fields.house_id !== previous.house_id) throw new PmsError('invalid', 'Não é possível transferir um quarto entre casas nesta operação.');
    fields.name_en = string(data.name_en ?? '', 0, 120, 'Nome EN');
    fields.max_adults = integer(data.max_adults, 1, 20, 'Adultos');
    fields.max_children = integer(data.max_children, 0, 20, 'Crianças');
    fields.max_babies = integer(data.max_babies ?? previous?.max_babies ?? 0, 0, 10, 'Bebés');
    fields.max_occupancy = integer(data.max_occupancy, 1, 30, 'Capacidade total');
    fields.min_nights = integer(data.min_nights, 1, 365, 'Mínimo de noites');
    fields.max_nights = integer(data.max_nights, Number(fields.min_nights), 365, 'Máximo de noites');
    if (Number(fields.max_occupancy) > Number(fields.max_adults) + Number(fields.max_children) + Number(fields.max_babies)) throw new PmsError('invalid', 'A capacidade total excede os limites de adultos, crianças e bebés.');
    // Omitted new fields preserve old clients' records. Explicit null clears an optional field.
    for (const [key,label] of Object.entries(bedFields)) {
      const value=Object.hasOwn(data,key) ? data[key] : previous?.[key];
      fields[key]=value==null || value==='' ? null : integer(value,0,key==='cots' ? 10 : 20,label);
    }
    for (const [key,max] of [['internal_code',40],['room_type',100],['floor',40],['accessibility_pt',2000],['accessibility_en',2000]] as const) fields[key]=string(data[key] ?? previous?.[key] ?? '',0,max,key);
    for (const [key,options] of [['bathroom',bathrooms],['access_type',accessTypes]] as const) {
      const value=Object.hasOwn(data,key) ? data[key] : previous?.[key];
      if (value!=null && value!=='' && !Object.hasOwn(options,String(value))) throw new PmsError('invalid', 'Característica do quarto inválida.');
      fields[key]=value==null || value==='' ? null : value;
    }
    const selected=data.amenities ?? previous?.amenities ?? [];
    if (!Array.isArray(selected) || selected.length>Object.keys(amenities).length || selected.some(value=>typeof value!=='string' || !Object.hasOwn(amenities,value)) || new Set(selected).size!==selected.length) throw new PmsError('invalid','Comodidades inválidas.');
    fields.amenities=JSON.stringify([...selected].sort());
    if (!['full','deposit','pay_later'].includes(String(data.payment_policy))) throw new PmsError('invalid', 'Cobrança inválida.');
    fields.payment_policy = data.payment_policy;
    fields.deposit_percent = data.payment_policy === 'deposit' ? integer(data.deposit_percent, 1, 99, 'Sinal') : null;
    for (const key of ['check_in_from','check_in_until','check_out_until']) fields[key] = time(data[key]);
    if (fields.check_in_from && fields.check_in_until && fields.check_in_from > fields.check_in_until) throw new PmsError('invalid', 'O fim do check-in tem de ser posterior ao início.');
    if (data.rate_from || data.rate_until || data.rate_amount) {
      const from = string(data.rate_from, 10, 10, 'Primeira noite'), until = string(data.rate_until, 10, 10, 'Fim do período');
      validateStay({ roomId: id, checkIn: from, checkOut: until, adults: 1, children: 0 });
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
      if (from < today) throw new PmsError('invalid', 'Configure apenas preços para datas atuais ou futuras.');
      const amount = string(data.rate_amount, 1, 9, 'Preço');
      if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) throw new PmsError('invalid', 'Preço inválido. Use, por exemplo, 95.00.');
      const [euros, fraction = ''] = amount.split('.');
      const cents = Number(euros) * 100 + Number(fraction.padEnd(2, '0'));
      integer(cents, 1, 1_000_000, 'Preço');
      ratePlan = { from, until, cents };
      if (previous) previousRates = (await db.query('SELECT stay_date,amount_cents FROM nightly_rates WHERE room_id=$1 AND stay_date >= $2 AND stay_date < $3 ORDER BY stay_date', [id, from, until])).rows;
    }
    if (status === 'active') {
      if (house.status !== 'active') throw new PmsError('invalid', 'Ative primeiro a casa.');
      if (!fields.name_en || !fields.description_pt || !fields.description_en || !fields.check_in_from || !fields.check_in_until || !fields.check_out_until) throw new PmsError('invalid', 'Preencha os textos PT/EN e horários antes de publicar.');
      const prices = await db.query('SELECT 1 FROM nightly_rates WHERE room_id = $1 AND stay_date >= (now() AT TIME ZONE \'Europe/Lisbon\')::date LIMIT 1', [id]);
      if (!prices.rows.length && !ratePlan) throw new PmsError('invalid', 'Configure preços futuros antes de publicar.');
    }
  }
  // Existing contracts keep their original snapshot and inventory. Demand explicit acknowledgement.
  if (previous && previous.status === 'active' && status !== 'active') {
    const future = await db.query(`SELECT count(*)::int AS count FROM reservations r JOIN rooms rm ON rm.id = r.room_id WHERE ${entity === 'room' ? 'rm.id' : 'rm.house_id'} = $1 AND ${activeReservation.replace('status IN', 'r.status IN')}`, [id]);
    if (Number(future.rows[0].count) > 0 && data.acknowledge_future !== true) throw new PmsError('conflict', 'Existem reservas futuras. Confirme que as continuará a cumprir antes de retirar a publicação.');
  }
  const keys = Object.keys(fields), values = Object.values(fields);
  try {
    if (previous) await db.query(`UPDATE ${table} SET ${keys.map((key, i) => `${key} = $${i + 2}`).join(', ')}, revision = revision + 1, updated_at = now() WHERE id = $1`, [id, ...values]);
    else await db.query(`INSERT INTO ${table} (id, ${keys.join(', ')}) VALUES (${[id,...values].map((_,i) => `$${i + 1}`).join(', ')})`, [id,...values]);
  } catch (error) {
    if ((error as { code?: string }).code === '23505') throw new PmsError('conflict', 'Esse endereço já está a ser utilizado.');
    throw error;
  }
  if (ratePlan) await db.query(`INSERT INTO nightly_rates(room_id,stay_date,amount_cents)
    SELECT $1, date::date, $4 FROM generate_series($2::date, $3::date - 1, interval '1 day') AS date
    ON CONFLICT (room_id,stay_date) DO UPDATE SET amount_cents=EXCLUDED.amount_cents, updated_at=now()`, [id, ratePlan.from, ratePlan.until, ratePlan.cents]);
  await db.query('INSERT INTO audit_log(actor, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)', [actor, previous ? 'configuration.updated' : 'configuration.created', entity, id, JSON.stringify({ before: previous, after: fields, rates: ratePlan ? { before: previousRates, after: ratePlan } : undefined })]);
  return { id, revision: previous ? Number(previous.revision) + 1 : 1 };
}
