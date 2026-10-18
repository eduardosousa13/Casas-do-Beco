import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {queueContactMessage,deliverContactEmail} from '../pms/contact-email';
import {EmailDeliveryError} from '../server/email';
import {alertEligible,type AlertEvent} from '../pms/alert-worker';
const db=new PGlite();
const message={nome:'Test Guest',email:'guest@example.com',telefone:'+351 910 000 000',casa:'geral' as const,mensagem:'Mensagem de teste para guardar na base.'};
before(async()=>{
  const dir=new URL('../pms/migrations/',import.meta.url);
  for(const f of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(f,dir),'utf8'));
});
after(()=>db.close());
test('contact data survives failed notification; durable recipient and ID remain stable across retry',async()=>{
  const id=await queueContactMessage(db,message,'owner@example.com');
  const stored=(await db.query<Record<string,unknown>>('SELECT * FROM contact_messages WHERE id=$1',[id])).rows[0];
  assert.equal(stored.name,message.nome);assert.equal(stored.email,message.email);assert.equal(stored.phone,message.telefone);
  assert.equal(stored.subject,message.casa);assert.equal(stored.message,message.mensagem);assert.equal(stored.status,'queued');assert.ok(stored.created_at);
  await db.transaction(tx=>deliverContactEmail(tx,async(current,options)=>{assert.deepEqual(current,message);assert.deepEqual(options,{id,recipient:'owner@example.com'});throw new EmailDeliveryError('rate_limit',180);}));
  const pending=(await db.query<{available_at:Date;status:string;attempts:number}>('SELECT * FROM contact_messages WHERE id=$1',[id])).rows[0];
  assert.equal(pending.status,'queued');assert.equal(pending.attempts,1);assert.ok(new Date(pending.available_at).getTime()-Date.now()>175000);
  assert.equal(await db.transaction(tx=>deliverContactEmail(tx,async()=>assert.fail('must wait before retry'))),false);
  await db.query('UPDATE contact_messages SET available_at=now() WHERE id=$1',[id]);
  await db.transaction(tx=>deliverContactEmail(tx,async(current,options)=>{assert.deepEqual(current,message);assert.deepEqual(options,{id,recipient:'owner@example.com'});}));
  const sent=(await db.query<Record<string,unknown>>('SELECT * FROM contact_messages WHERE id=$1',[id])).rows[0];
  assert.equal(sent.status,'sent');assert.equal(sent.attempts,2);assert.equal(sent.message,message.mensagem);
});
test('exhausted contact notification keeps intake and alerts only the technical group without personal data',async()=>{
  const id=await queueContactMessage(db,message,'owner@example.com');
  await db.query('UPDATE contact_messages SET attempts=4 WHERE id=$1',[id]);
  await db.transaction(tx=>deliverContactEmail(tx,async()=>{throw Error('provider includes '+message.email);}));
  const row=(await db.query<Record<string,unknown>>('SELECT * FROM contact_messages WHERE id=$1',[id])).rows[0];
  assert.equal(row.status,'failed');assert.equal(row.attempts,5);assert.equal(row.message,message.mensagem);
  const event=(await db.query<AlertEvent&{destination:string}>('SELECT * FROM alert_events WHERE entity_id=$1',[id])).rows[0];
  assert.equal(event.destination,'technical');assert.ok(alertEligible(event,'technical'));assert.equal(alertEligible(event,'operations'),false);
  assert.ok(!JSON.stringify(event).includes(message.email));assert.ok(!JSON.stringify(event).includes(message.mensagem));
  assert.equal(await db.transaction(tx=>deliverContactEmail(tx,async()=>assert.fail('must not retry exhausted jobs'))),false);
});
test('invalid contact never enters the database',async()=>{
  await assert.rejects(queueContactMessage(db,{...message,mensagem:'short'}));
});
