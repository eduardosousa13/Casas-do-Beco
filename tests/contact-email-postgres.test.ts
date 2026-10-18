import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {test} from 'node:test';
import pg from 'pg';
import {queueContactMessage,deliverContactEmail} from '../pms/contact-email';

test('PostgreSQL serializes contact delivery across workers and retains intake after commit',async()=>{
  const original=process.env.DATABASE_URL!;assert.ok(original);
  const url=new URL(original);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
  const schema='contact_test_'+randomUUID().replaceAll('-',''),control=new pg.Pool({connectionString:original});
  await control.query(`CREATE SCHEMA ${schema}`);url.searchParams.set('options',`-c search_path=${schema}`);
  const db=new pg.Pool({connectionString:url.toString()});
  try{
    const dir=new URL('../pms/migrations/',import.meta.url);
    for(const f of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile(new URL(f,dir),'utf8'));
    const id=await queueContactMessage(db,{nome:'Test only',email:'test@example.invalid',telefone:'',casa:'geral',mensagem:'Concurrency test, no actual email.'},'owner@example.invalid');
    let deliveries=0;
    const take=async()=>{
      const client=await db.connect();
      try{
        await client.query('BEGIN');
        const processed=await deliverContactEmail(client,async(_message,options)=>{assert.equal(options.id,id);deliveries++;});
        await client.query('COMMIT');return processed;
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    };
    const results=await Promise.all([take(),take()]);
    assert.equal(results.filter(Boolean).length,1);assert.equal(deliveries,1);
    const saved=(await db.query('SELECT * FROM contact_messages WHERE id=$1',[id])).rows[0];
    assert.equal(saved.status,'sent');assert.equal(saved.message,'Concurrency test, no actual email.');
  }finally{
    await db.end();await control.query(`DROP SCHEMA ${schema} CASCADE`);await control.end();
  }
});
