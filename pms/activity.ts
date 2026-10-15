import { PmsError, type Sql } from './core';
import { bedFields, amenities } from './room-catalog';

// Only configuration fields may reach the history response. Never return raw
// audit payloads: future entries may contain private operational information.
export const historyFields = {
  name: 'Nome português', name_en: 'Nome inglês', slug: 'Endereço', status: 'Publicação',
  description_pt: 'Descrição PT', description_en: 'Descrição EN',
  address_line1: 'Morada', address_line2: 'Complemento da morada', postal_code: 'Código postal', locality: 'Localidade',
  house_id: 'Casa', max_adults: 'Máximo de adultos', max_children: 'Máximo de crianças', max_occupancy: 'Capacidade total',
  min_nights: 'Mínimo de noites', max_nights: 'Máximo de noites', payment_policy: 'Cobrança', deposit_percent: 'Sinal (%)',
  check_in_from: 'Check-in a partir de', check_in_until: 'Check-in até', check_out_until: 'Check-out até',
  ...bedFields, max_babies:'Máximo de bebés', internal_code:'Código interno', room_type:'Tipo de quarto', floor:'Piso', bathroom:'Casa de banho', access_type:'Acesso', accessibility_pt:'Acessibilidade PT', accessibility_en:'Acessibilidade EN', amenities:'Comodidades confirmadas',
} as const;
const securityActions = ['mfa.enrolled', 'mfa.replacement_started', 'sessions.revoked', 'password.recovered'];
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
function scalar(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;
}
function normalized(key: string, value: unknown) {
  if (key==='amenities') {
    let list=value;
    if(typeof value==='string') { try {list=JSON.parse(value);} catch {return null;} }
    return Array.isArray(list) ? list.filter(item=>typeof item==='string' && Object.hasOwn(amenities,item)).sort().map(item=>amenities[item as keyof typeof amenities]).join(', ') : null;
  }
  const result = scalar(value);
  return key.startsWith('check_') && typeof result === 'string' ? result.slice(0, 5) : result;
}
export async function activityList(db: Sql, params: URLSearchParams) {
  const kind = params.get('kind') || '', cursor = params.get('before') || '', entityId = params.get('entity') || '';
  if (!['', 'house', 'room', 'staff'].includes(kind) || (cursor && !/^[1-9]\d{0,17}$/.test(cursor)) ||
    (entityId && (!['house', 'room'].includes(kind) || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(entityId)))) {
    throw new PmsError('invalid', 'Filtro de histórico inválido.');
  }
  const result = await db.query(`SELECT a.id::text, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
    COALESCE(u.name, 'Operação local') AS actor_name,
    CASE WHEN a.entity_type='house' THEN h.name WHEN a.entity_type='room' THEN r.name ELSE 'Conta administrativa' END AS entity_name
    FROM audit_log a LEFT JOIN pms_auth_user u ON u.id=a.actor
    LEFT JOIN houses h ON a.entity_type='house' AND h.id::text=a.entity_id
    LEFT JOIN rooms r ON a.entity_type='room' AND r.id::text=a.entity_id
    WHERE ((a.entity_type IN ('house','room') AND a.action IN ('configuration.created','configuration.updated'))
      OR (a.entity_type='staff' AND a.action=ANY($1::text[])))
    AND ($2='' OR a.entity_type=$2) AND ($3='' OR a.id < NULLIF($3,'')::bigint)
    AND ($4='' OR a.entity_id=$4) ORDER BY a.id DESC LIMIT 41`, [securityActions, kind, cursor, entityId]);
  const rows = result.rows.slice(0, 40).map(row => {
    const details = row.entity_type === 'staff' ? {} : object(row.details), before = object(details.before), after = object(details.after);
    const changes = Object.entries(historyFields).filter(([key]) => Object.hasOwn(after, key))
      .map(([key, label]) => ({ key, label, before: normalized(key, before[key]), after: normalized(key, after[key]) }))
      .filter(change => change.before !== change.after);
    const rate = object(object(details.rates).after);
    const oldRates = object(details.rates).before;
    const previousRates = Array.isArray(oldRates) ? oldRates.slice(0, 365).map(object).filter(value=>Number.isInteger(value.amount_cents) && (typeof value.stay_date === 'string' || value.stay_date instanceof Date))
      .map(value=>({date:value.stay_date instanceof Date ? value.stay_date.toISOString().slice(0,10) : String(value.stay_date).slice(0,10), cents:Number(value.amount_cents)})) : [];
    const rates = typeof rate.from === 'string' && typeof rate.until === 'string' && Number.isInteger(rate.cents)
      ? { from: rate.from.slice(0, 10), until: rate.until.slice(0, 10), cents: Number(rate.cents), before: previousRates } : null;
    return { id: String(row.id), action: String(row.action), entityType: String(row.entity_type), entityId: String(row.entity_id),
      entityName: String(row.entity_name || after.name || before.name || 'Alojamento'), actorName: String(row.actor_name),
      createdAt: row.created_at, changes, rates };
  });
  return { entries: rows, nextCursor: result.rows.length > 40 ? rows.at(-1)!.id : null };
}

export async function sessionList(db: Sql, userId: string, currentId: string) {
  const result = await db.query(`SELECT id, "createdAt", "updatedAt", "expiresAt", "userAgent"
    FROM pms_auth_session WHERE "userId"=$1 AND "expiresAt">now() ORDER BY "createdAt" DESC`, [userId]);
  return { sessions: result.rows.map(row => ({ id: String(row.id), current: row.id === currentId,
    createdAt: row.createdAt, updatedAt: row.updatedAt, expiresAt: row.expiresAt,
    userAgent: typeof row.userAgent === 'string' ? row.userAgent.slice(0, 500) : '' })) };
}

// Execute in a transaction. Session IDs identify records, never authenticate.
export async function revokeSession(db: Sql, userId: string, currentId: string, input: unknown) {
  const data = object(input);
  if (typeof data.id !== 'string' || !data.id.trim() || data.id.length > 200) throw new PmsError('invalid', 'Sessão inválida.');
  if (data.id === currentId) throw new PmsError('invalid', 'Use Terminar sessão para sair deste dispositivo.');
  const deleted = await db.query('DELETE FROM pms_auth_session WHERE id=$1 AND "userId"=$2 RETURNING id', [data.id, userId]);
  // A stale retry succeeds, without revealing whether another account owns it.
  if (deleted.rows.length) await db.query("INSERT INTO audit_log(actor,action,entity_type,entity_id,details) VALUES ($1,'sessions.revoked','staff',$1,'{}')", [userId]);
  return { ok: true };
}
