import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { readFile,readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { queueRecoveryEmail,deliverRecoveryEmail } from '../pms/auth-email';
const db=new PGlite();
type Job={id:string;payload:string|null;status:string;attempts:number;available_at:Date};
before(async()=>{
  process.env.BETTER_AUTH_SECRET=randomUUID()+randomUUID();process.env.PUBLIC_SITE_URL='http://localhost:3004';
  const dir=new URL('../pms/migrations/',import.meta.url);
  for(const file of (await readdir(dir)).filter(file=>file.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file,dir),'utf8'));
});
after(()=>db.close());
async function fixture() {
  const user={id:randomUUID(),email:`${randomUUID()}@example.com`};
  await db.query('INSERT INTO pms_auth_user(id,name,email,"emailVerified") VALUES ($1,\'Test\',$2,false)',[user.id,user.email]);
  await db.query("INSERT INTO pms_staff(user_id,role) VALUES ($1,'owner')",[user.id]);
  return user;
}
test('queue encrypts recovery secrets, persists retry and removes delivered payload',async()=>{
  const user=await fixture(),token='test-token-never-log';
  await queueRecoveryEmail(db,user,token);
  const row=(await db.query<Job>('SELECT * FROM auth_email_jobs WHERE user_id=$1',[user.id])).rows[0];
  assert.ok(!String(row.payload).includes(token));assert.ok(!String(row.payload).includes(user.email));
  await db.transaction(tx=>deliverRecoveryEmail(tx,async()=>{throw new Error('provider error with sensitive data');}));
  const pending=(await db.query<Job>('SELECT * FROM auth_email_jobs WHERE id=$1',[row.id])).rows[0];
  assert.equal(pending.status,'queued');assert.equal(pending.attempts,1);
  assert.ok(new Date(String(pending.available_at))>new Date());
  assert.equal(await db.transaction(tx=>deliverRecoveryEmail(tx,async()=>{assert.fail('must wait before retry');})),false);
  await db.query('UPDATE auth_email_jobs SET available_at=now() WHERE id=$1',[row.id]);
  await db.transaction(tx=>deliverRecoveryEmail(tx,async message=>{
    assert.equal(message.to,user.email);assert.equal(new URLSearchParams(new URL(message.url).hash.slice(1)).get('token'),token);
  }));
  const sent=(await db.query<Job>('SELECT * FROM auth_email_jobs WHERE id=$1',[row.id])).rows[0];
  assert.equal(sent.status,'sent');assert.equal(sent.payload,null);assert.equal(sent.attempts,2);
});
test('expired, disabled and exhausted jobs never keep usable recovery payloads',async()=>{
  for(const scenario of ['expired','disabled','failed']) {
    const user=await fixture();await queueRecoveryEmail(db,user,randomUUID());
    if(scenario==='expired') await db.query("UPDATE auth_email_jobs SET expires_at=now()-interval '1 second' WHERE user_id=$1",[user.id]);
    if(scenario==='disabled') await db.query('UPDATE pms_staff SET enabled=false WHERE user_id=$1',[user.id]);
    if(scenario==='failed') await db.query('UPDATE auth_email_jobs SET attempts=4 WHERE user_id=$1',[user.id]);
    await db.transaction(tx=>deliverRecoveryEmail(tx,async()=>{assert.equal(scenario,'failed');throw new Error('simulated rejection');}));
    const job=(await db.query<Job>('SELECT * FROM auth_email_jobs WHERE user_id=$1',[user.id])).rows[0];
    assert.equal(job.status,scenario==='disabled' ? 'cancelled' : scenario);assert.equal(job.payload,null);
  }
});
