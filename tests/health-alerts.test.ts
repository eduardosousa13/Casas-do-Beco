import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {readiness} from '../server/health';
const db=new PGlite();
before(async()=>{const dir=new URL('../pms/migrations/',import.meta.url);for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));await db.exec('INSERT INTO pms_migrations(version) VALUES(13)');});
after(()=>db.close());
test('readiness refuses missing worker and database failures without leaking details',async()=>{
 assert.equal((await readiness(db,false)).status,200);
 assert.equal((await readiness(db,true)).status,503);
 await db.query("INSERT INTO worker_health VALUES('operations',now())");assert.equal((await readiness(db,true)).status,200);
 await db.query("UPDATE worker_health SET last_seen=now()-interval '10 minutes'");assert.equal((await readiness(db,true)).status,503);
 const response=await readiness({query:async()=>{throw Error('secret connection string');}},false);assert.equal(response.status,503);assert.deepEqual(await response.json(),{ok:false});
});
test('alert outbox commits atomically, ignores no-op updates and contains no guest data',async()=>{
 const house=randomUUID(),room=randomUUID(),id=randomUUID();
 await db.query("INSERT INTO houses(id,slug,name) VALUES($1,'alerts','Teste')",[house]);
 await db.query("INSERT INTO rooms(id,house_id,slug,name,max_adults,max_occupancy) VALUES($1,$2,'alerts','Quarto',2,2)",[room,house]);
 const insert=()=>db.query("INSERT INTO reservations(id,room_id,check_in,check_out,adults,guest_name,guest_email,source,status,accommodation_cents,total_cents,payment_due_cents,payment_policy) VALUES($1,$2,'2030-01-01','2030-01-02',1,'Never leak this guest','private@example.invalid','admin','confirmed',10000,10000,10000,'pay_later')",[id,room]);
 await db.exec('BEGIN');await insert();await db.exec('ROLLBACK');assert.equal((await db.query('SELECT * FROM alert_events')).rows.length,0);
 await insert();await db.query('UPDATE reservations SET status=status WHERE id=$1',[id]);assert.equal((await db.query('SELECT * FROM alert_events')).rows.length,1);
 await db.query("UPDATE reservations SET status='checked_in' WHERE id=$1",[id]);const events=(await db.query<{state:string;delivered_at:string|null}>('SELECT * FROM alert_events ORDER BY id')).rows;assert.equal(events.length,2);assert.equal(events[1].state,'checked_in');assert.equal(events[0].delivered_at,null);assert.equal(JSON.stringify(events).includes('private@example.invalid'),false);assert.equal(JSON.stringify(events).includes('Never leak'),false);
 await db.query('UPDATE reservations SET revision=revision+1 WHERE id=$1',[id]);
 const changes=(await db.query<{state:string}>('SELECT state FROM alert_events ORDER BY id')).rows;assert.equal(changes.length,3);assert.equal(changes[2].state,'changed');
});
