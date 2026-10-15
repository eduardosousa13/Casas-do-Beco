import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';
import { createPendingReservation } from '../pms/core';
import { database, transaction } from '../pms/db';

test('PostgreSQL prevents simultaneous reservations of one room', async () => {
  const houseId = randomUUID();
  const roomId = randomUUID();
  const slug = `test-${houseId.slice(0, 8)}`;
  const original=process.env.DATABASE_URL!;
  const url=new URL(original);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
  const schema='pms_test_'+randomUUID().replaceAll('-','');
  const control=new pg.Pool({connectionString:original});await control.query(`CREATE SCHEMA ${schema}`);
  url.searchParams.set('options',`-c search_path=${schema}`);process.env.DATABASE_URL=url.href;
  const db = database();
  try {
    const dir=new URL('../pms/migrations/',import.meta.url);
    for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile(new URL(file,dir),'utf8'));
    await db.query(`INSERT INTO houses (id, slug, name, status)
      VALUES ($1,$2,'Integration test house','active')`, [houseId, slug]);
    await db.query(`INSERT INTO rooms (id, house_id, slug, name, status, max_adults, max_occupancy)
      VALUES ($1,$2,'room','Integration test room','active',2,2)`, [roomId, houseId]);
    await db.query(`INSERT INTO nightly_rates (room_id, stay_date, amount_cents)
      VALUES ($1,'2030-01-01',10000),($1,'2030-01-02',10000)`, [roomId]);
    const input = {
      stay: { roomId, checkIn: '2030-01-01', checkOut: '2030-01-03', adults: 2, children: 0 },
      guest: { name: 'Test Guest', email: 'test@example.com', locale: 'pt' as const },
      policySnapshot: { test: true }, termsAccepted: true, privacyAcknowledged: true,
    };
    const deadline = new Date(Date.now() + 3_600_000);
    const attempts = await Promise.allSettled([
      transaction(tx => createPendingReservation(tx, input, '2029-01-01', deadline)),
      transaction(tx => createPendingReservation(tx, input, '2029-01-01', deadline)),
    ]);
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(attempts.filter(result => result.status === 'rejected').length, 1);
    const nights = await db.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM inventory_nights WHERE room_id = $1', [roomId]);
    assert.equal(nights.rows[0].count, 2);
    assert.doesNotThrow(()=>db.emit('error',new Error('simulated private connection details')));
    assert.equal((await db.query('SELECT 1 AS connected')).rows[0].connected,1);
  } finally {
    await db.end();
    await control.query(`DROP SCHEMA ${schema} CASCADE`);await control.end();
    process.env.DATABASE_URL=original;
  }
});
