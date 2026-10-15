import assert from'node:assert/strict';
import{test}from'node:test';
import{randomUUID}from'node:crypto';
import{readFile,readdir}from'node:fs/promises';
import pg from'pg';
import{deliverAlerts}from'../pms/alert-worker';
test('PostgreSQL channel lease prevents duplicate delivery by concurrent workers',async()=>{
 const original=process.env.DATABASE_URL!;assert.ok(['localhost','127.0.0.1'].includes(new URL(original).hostname));
 const schema='telegram_test_'+randomUUID().replaceAll('-','');const control=new pg.Pool({connectionString:original});await control.query(`CREATE SCHEMA ${schema}`);
 const url=new URL(original);url.searchParams.set('options',`-c search_path=${schema}`);const pool=new pg.Pool({connectionString:url.href});
 try{
  const dir=new URL('../pms/migrations/',import.meta.url);for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await pool.query(await readFile(new URL(file,dir),'utf8'));
  await pool.query("INSERT INTO alert_events(kind,entity_type,entity_id,state) VALUES('system','system',$1,'test')",[randomUUID()]);
  const config={token:'123456789:test_token_not_real_000000000',chatId:'-123456789',from:new Date('2026-01-01Z'),site:'https://www.casasdobeco.com'};
  let calls=0;const send=async()=>{calls++;await new Promise(r=>setTimeout(r,25));return{ok:true} as const;};
  await Promise.all([deliverAlerts(pool,config,send),deliverAlerts(pool,config,send)]);assert.equal(calls,1);assert.equal((await pool.query('SELECT delivery_status FROM alert_events')).rows[0].delivery_status,'sent');
 }finally{await pool.end();await control.query(`DROP SCHEMA ${schema} CASCADE`);await control.end();}
});
