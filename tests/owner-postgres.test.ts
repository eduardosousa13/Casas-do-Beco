import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
import { test } from 'node:test';
import pg from 'pg';
import { operate } from '../pms/owner';

test('owner concurrency: same request is replayed once and competing stays cannot overlap',async()=>{
 const original=process.env.DATABASE_URL!;assert.ok(original);const url=new URL(original);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
 const schema='owner_test_'+randomUUID().replaceAll('-',''),control=new pg.Pool({connectionString:original});await control.query(`CREATE SCHEMA ${schema}`);url.searchParams.set('options',`-c search_path=${schema}`);const db=new pg.Pool({connectionString:url.toString()});
 try {
  const dir=new URL('../pms/migrations/',import.meta.url);for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile(new URL(f,dir),'utf8'));
  await db.query("INSERT INTO booking_policies(version,active,terms_pt,terms_en,cancellation_pt,cancellation_en,privacy_url) VALUES('test',true,'Condições de teste sem validade','Test conditions for test only','Cancelamento de teste apenas','Cancellation conditions test','https://example.com/privacy')");
  const house=randomUUID(),room=randomUUID();await db.query("INSERT INTO houses(id,slug,name,status) VALUES($1,$2,'Test only','active')",[house,house]);await db.query("INSERT INTO rooms(id,house_id,slug,name,status,max_adults,max_occupancy) VALUES($1,$2,'room','Test only','active',2,2)",[room,house]);await db.query("INSERT INTO nightly_rates(room_id,stay_date,amount_cents) VALUES($1,'2030-06-10',10000),($1,'2030-06-11',10000)",[room]);
  const body={key:randomUUID(),action:'manual',stay:{roomId:room,checkIn:'2030-06-10',checkOut:'2030-06-12',adults:2,children:0,babies:0},guest:{name:'Test only',email:'test@example.invalid',locale:'pt'},expectedTotal:20000,acknowledged:true};
  const act=async(input:Record<string,unknown>)=>{const c=await db.connect();try{await c.query('BEGIN');const result=await operate(c,'test-only',input,'2029-01-01');await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
  const [first,again]=await Promise.all([act(body),act(body)]);assert.deepEqual(first,again);assert.equal((await db.query('SELECT count(*)::int AS n FROM reservations')).rows[0].n,1);
  const attempts=await Promise.allSettled([act({...body,key:randomUUID()}),act({...body,key:randomUUID()})]);assert.ok(attempts.every(a=>a.status==='rejected'));assert.equal((await db.query('SELECT count(*)::int AS n FROM inventory_nights')).rows[0].n,2);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM reservation_emails')).rows[0].n,1);
 }finally{await db.end();await control.query(`DROP SCHEMA ${schema} CASCADE`);await control.end();}
});
