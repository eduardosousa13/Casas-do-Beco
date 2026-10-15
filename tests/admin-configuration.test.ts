import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { AccessError, authorizeStaff, checkOrigin } from '../pms/auth';
import { configurationList, saveConfiguration } from '../pms/configuration';
import { activityList } from '../pms/activity';
import { createPendingReservation, quoteStay } from '../pms/core';

const db = new PGlite();
before(async () => {
  const dir = new URL('../pms/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(file => file.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, dir), 'utf8'));
});
after(() => db.close());
const houseInput = { entity: 'house', name: 'Casa de teste', slug: '', status: 'draft' };
const roomInput = { entity: 'room', name: 'Quarto de teste', name_en: 'Test room', slug: 'test-room', status: 'draft', max_adults: 2, max_children: 1, max_occupancy: 3, min_nights: 1, max_nights: 30, payment_policy: 'deposit', deposit_percent: 30, description_pt: 'Descrição de teste', description_en: 'Test description', check_in_from: '15:00', check_in_until: '22:00', check_out_until: '11:00' };
async function fixture() {
  const house = await db.transaction(tx => saveConfiguration(tx, 'test-actor', { ...houseInput, slug: `test-${randomUUID()}` }));
  const room = await db.transaction(tx => saveConfiguration(tx, 'test-actor', { ...roomInput, house_id: house.id }));
  return { house, room };
}
const update = (data: object) => db.transaction(tx => saveConfiguration(tx, 'test-actor', data));

test('drafts cannot sell; publishing requires active house, content, times and future prices', async () => {
  const { house, room } = await fixture();
  const stay = { roomId: room.id, checkIn: '2030-06-01', checkOut: '2030-06-02', adults: 2, children: 0 };
  await assert.rejects(quoteStay(db, stay, '2030-01-01'));
  const published = { ...roomInput, id: room.id, revision: 1, house_id: house.id, status: 'active' };
  await assert.rejects(update(published), /Ative primeiro/);
  await update({ ...houseInput, id: house.id, slug: `test-${house.id}`, revision: 1, status: 'active' });
  await assert.rejects(update(published), /Configure preços/);
  await db.query("INSERT INTO nightly_rates(room_id,stay_date,amount_cents) VALUES ($1,'2030-06-01',10000)", [room.id]);
  await assert.rejects(update({ ...published, description_en: '' }), /textos PT/);
  await assert.rejects(update({ ...published, check_in_until: '' }), /horários/);
  await update(published);
  const quote = await quoteStay(db, stay, '2030-01-01');
  assert.equal(quote.paymentDueCents, 3000);
  await assert.rejects(quoteStay(db, { ...stay, checkOut: '2030-06-03' }, '2030-01-01'));
});

test('stale edits are rejected and audit/data stay atomic', async () => {
  const { house } = await fixture();
  const input = { ...houseInput, id: house.id, slug: `test-${house.id}`, revision: 1 };
  await update({ ...input, name: 'Primeira edição' });
  await assert.rejects(update({ ...input, name: 'Edição antiga' }), /Outra pessoa/);
  const result = (await configurationList(db)).houses.find(h => h.id === house.id);
  assert.equal(result?.name, 'Primeira edição');
  const audit = await db.query<{ actor: string }>('SELECT * FROM audit_log WHERE entity_id = $1', [house.id]);
  assert.equal(audit.rows.length, 2);
  assert.ok(audit.rows.every(row => row.actor === 'test-actor'));
});

test('reject invalid capacity, deposit, times, slug and moving a room', async () => {
  const { room, house } = await fixture();
  const input = { ...roomInput, id: room.id, revision: 1, house_id: house.id };
  for (const change of [{ max_occupancy: 5 }, { deposit_percent: 100 }, { check_in_from: '27:00' }, { check_in_until: '12:00' }, { slug: '../bad' }, { max_nights: 0 }]) await assert.rejects(update({ ...input, ...change }));
  const other = await fixture();
  await assert.rejects(update({ ...input, house_id: other.house.id }), /transferir/);
  assert.equal((await db.query<{ revision: number }>('SELECT revision FROM rooms WHERE id = $1', [room.id])).rows[0].revision, 1);
});

test('server denies anonymous, non-management, disabled staff and missing MFA', async () => {
  await assert.rejects(authorizeStaff(db, null), error => error instanceof AccessError && error.status === 401);
  const id = randomUUID();
  await db.query('INSERT INTO pms_auth_user(id,name,email,"emailVerified") VALUES ($1,\'Test\',$2,false)', [id, `${id}@example.com`]);
  await db.query("INSERT INTO pms_staff(user_id,role) VALUES ($1,'cleaner')", [id]);
  const session = { user: { id, name: 'Test', twoFactorEnabled: true } };
  for (const role of ['cleaner','viewer','manager']) {
    await db.query('UPDATE pms_staff SET role=$2 WHERE user_id=$1', [id, role]);
    await assert.rejects(authorizeStaff(db, session), error => error instanceof AccessError && error.status === 403);
  }
  await db.query("UPDATE pms_staff SET role='owner' WHERE user_id=$1", [id]);
  await assert.rejects(authorizeStaff(db, { user: { ...session.user, twoFactorEnabled: false } }), /segundo fator/);
  assert.equal((await authorizeStaff(db, session)).role, 'owner');
  await db.query('UPDATE pms_staff SET enabled=false WHERE user_id=$1', [id]);
  await assert.rejects(authorizeStaff(db, session), /permissão/);
});

test('mutations reject missing or foreign Origin', () => {
  process.env.PUBLIC_SITE_URL = 'http://localhost:3004';
  for (const origin of ['', 'https://attacker.example']) assert.throws(() => checkOrigin(new Request('http://localhost:3004/api/admin/configuration', { headers: { origin } })), AccessError);
  assert.doesNotThrow(() => checkOrigin(new Request('http://localhost:3004/api/admin/configuration', { headers: { origin: 'http://localhost:3004' } })));
});

test('panel creates prices atomically, excludes the end date and rejects invalid batches', async () => {
  const { house, room } = await fixture();
  const input = { ...roomInput, id: room.id, revision: 1, house_id: house.id };
  for (const change of [{ rate_from: '2030-02-30', rate_until: '2030-03-02', rate_amount: '95.00' }, { rate_from: '2030-06-01', rate_until: '2030-06-03', rate_amount: '-1' }, { rate_from: '2030-06-01' }]) await assert.rejects(update({ ...input, ...change }));
  await update({ ...input, rate_from: '2030-06-01', rate_until: '2030-06-03', rate_amount: '95.01' });
  const rates = await db.query<{ amount_cents: number; stay_date: string }>('SELECT amount_cents, stay_date FROM nightly_rates WHERE room_id=$1 ORDER BY stay_date', [room.id]);
  assert.equal(rates.rows.length, 2);
  assert.ok(rates.rows.every(row => row.amount_cents === 9501));
  const audit = await db.query<{ details: { rates: { after: { cents: number } } } }>("SELECT details FROM audit_log WHERE entity_id=$1 AND action='configuration.updated'", [room.id]);
  assert.equal(audit.rows[0].details.rates.after.cents, 9501);
});

test('withdrawing publication requires acknowledging future stays and preserves their inventory and contract', async () => {
  const { house, room } = await fixture();
  await update({ ...houseInput, id: house.id, slug: `test-${house.id}`, revision: 1, status: 'active' });
  const input = { ...roomInput, id: room.id, house_id: house.id, revision: 1, status: 'active', rate_from: '2030-06-01', rate_until: '2030-06-02', rate_amount: '100.00' };
  await update(input);
  const reservation = await db.transaction(tx => createPendingReservation(tx, { stay: { roomId: room.id, checkIn: '2030-06-01', checkOut: '2030-06-02', adults: 2, children: 0 }, guest: { name: 'Test Guest', email: 'test@example.com', locale: 'pt' }, policySnapshot: { version: 'test' }, termsAccepted: true, privacyAcknowledged: true }, '2030-01-01', new Date(Date.now() + 3600000)));
  const withdrawal = { ...input, revision: 2, status: 'draft', rate_amount: '150.00' };
  await assert.rejects(update(withdrawal), /reservas futuras/);
  assert.equal((await db.query<{ amount_cents: number }>('SELECT amount_cents FROM nightly_rates WHERE room_id=$1', [room.id])).rows[0].amount_cents, 10000);
  await update({ ...withdrawal, acknowledge_future: true });
  assert.equal((await db.query<{ accommodation_cents: number }>('SELECT accommodation_cents FROM reservations WHERE id=$1', [reservation.id])).rows[0].accommodation_cents, 10000);
  assert.equal((await db.query('SELECT 1 FROM inventory_nights WHERE reservation_id=$1', [reservation.id])).rows.length, 1);
});

test('saving an existing room accepts PostgreSQL time values without editing the hours', async () => {
  const { room } = await fixture();
  const stored = (await configurationList(db)).rooms.find(item => item.id === room.id)!;
  assert.equal(stored.check_in_from, '15:00:00');
  await update({ ...stored, entity: 'room', name: 'Nome alterado' });
  assert.equal((await configurationList(db)).rooms.find(item => item.id === room.id)?.name, 'Nome alterado');
});

test('room details preserve unknown values, validate choices and survive older clients',async()=>{
  const {house,room}=await fixture();
  const input={...roomInput,id:room.id,revision:1,house_id:house.id};
  const original=(await configurationList(db)).rooms.find(item=>item.id===room.id)!;
  assert.equal(original.beds_single,null);assert.equal(original.bathroom,null);assert.deepEqual(original.amenities,[]);assert.equal(original.max_babies,0);
  for(const change of [{beds_single:-1},{beds_single:1.5},{beds_single:'2'},{cots:11},{bathroom:'unknown'},{access_type:'accessible'},{amenities:['wifi','wifi']},{amenities:['<script>']},{amenities:'wifi'},{internal_code:'x'.repeat(41)},{accessibility_en:'x'.repeat(2001)},{max_babies:11}]) await assert.rejects(update({...input,...change}));
  await update({...input,internal_code:'P-01',floor:'Rés-do-chão',beds_single:0,beds_double:1,cots:1,bathroom:'private',access_type:'step_free',amenities:['wifi','heating'],accessibility_pt:'Entrada sem degraus; WC não adaptado.',max_babies:1});
  // A client predating the new fields must not silently erase them.
  await update({...input,revision:2,name:'Nome alterado'});
  const stored=(await configurationList(db)).rooms.find(item=>item.id===room.id)!;
  assert.equal(stored.beds_single,0);assert.equal(stored.beds_double,1);assert.equal(stored.cots,1);assert.equal(stored.max_babies,1);
  assert.equal(stored.internal_code,'P-01');assert.deepEqual(stored.amenities,['heating','wifi']);
  const history=await activityList(db,new URLSearchParams({kind:'room',entity:room.id}));
  assert.ok(history.entries.some(entry=>entry.changes.some(change=>change.key==='amenities' && change.after==='Aquecimento, Wi-Fi')));
  await update({...input,revision:3,beds_single:null,bathroom:null,amenities:[]});
  const cleared=(await configurationList(db)).rooms.find(item=>item.id===room.id)!;
  assert.equal(cleared.beds_single,null);assert.equal(cleared.bathroom,null);assert.deepEqual(cleared.amenities,[]);
});

test('babies count towards room capacity and are saved in the reservation without changing nightly prices',async()=>{
  const {house,room}=await fixture();
  await update({...houseInput,id:house.id,slug:`test-${house.id}`,revision:1,status:'active'});
  const input={...roomInput,id:room.id,house_id:house.id,revision:1,status:'active',max_children:0,max_babies:1,max_occupancy:3,rate_from:'2030-06-01',rate_until:'2030-06-02',rate_amount:'100.00'};
  await update(input);
  const stay={roomId:room.id,checkIn:'2030-06-01',checkOut:'2030-06-02',adults:2,children:0,babies:1};
  const quote=await quoteStay(db,stay,'2030-01-01');assert.equal(quote.babies,1);assert.equal(quote.accommodationCents,10000);
  for(const babies of [-1,1.5,2]) await assert.rejects(quoteStay(db,{...stay,babies},'2030-01-01'));
  await update({...input,revision:2,max_occupancy:2});
  await assert.rejects(quoteStay(db,stay,'2030-01-01'),/capacidade/);
  await update({...input,revision:3});
  const reservation=await db.transaction(tx=>createPendingReservation(tx,{stay,guest:{name:'Test Guest',email:'test@example.com',locale:'pt'},policySnapshot:{version:'test'},termsAccepted:true,privacyAcknowledged:true},'2030-01-01',new Date(Date.now()+3600000)));
  assert.equal((await db.query<{babies:number}>('SELECT babies FROM reservations WHERE id=$1',[reservation.id])).rows[0].babies,1);
  await update({...input,revision:4,max_babies:0,max_occupancy:2});
  assert.equal((await db.query<{babies:number}>('SELECT babies FROM reservations WHERE id=$1',[reservation.id])).rows[0].babies,1);
});
