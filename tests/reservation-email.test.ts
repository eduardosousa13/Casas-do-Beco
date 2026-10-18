import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {operate} from '../pms/owner';
import {queueReservationEmail,deliverReservationEmail} from '../pms/reservation-email';
import {EmailDeliveryError} from '../server/email';

const db=new PGlite();
before(async()=>{
  const dir=new URL('../pms/migrations/',import.meta.url);
  for(const f of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(f,dir),'utf8'));
  await db.query("INSERT INTO booking_policies(version,active,terms_pt,terms_en,cancellation_pt,cancellation_en,privacy_url) VALUES('test',true,'Condições de teste sem validade','Test conditions for test only','Cancelamento de teste apenas','Cancellation conditions test','https://example.com/privacy')");
});
after(()=>db.close());
async function fixture(locale:'pt'|'en'){
  const house=randomUUID(),room=randomUUID();
  await db.query("INSERT INTO houses(id,slug,name,status) VALUES($1::uuid,$1::text,'Casa teste','active')",[house]);
  await db.query("INSERT INTO rooms(id,house_id,slug,name,status,max_adults,max_occupancy) VALUES($1,$2,'room','Quarto teste','active',2,2)",[room,house]);
  await db.query("INSERT INTO nightly_rates(room_id,stay_date,amount_cents) VALUES($1,'2030-06-10',10000)",[room]);
  return await db.transaction(tx=>operate(tx,'test-only',{key:randomUUID(),action:'manual',stay:{roomId:room,checkIn:'2030-06-10',checkOut:'2030-06-11',adults:2,children:0,babies:0},guest:{name:'Test Guest',email:'test@example.com',locale},acknowledged:true,expectedTotal:10000},'2029-01-01')) as {id:string};
}
test('reservation emails preserve PT/EN, deduplicate events and retain booking after delivery failure',async()=>{
  for(const locale of ['pt','en'] as const){
    const {id}=await fixture(locale);
    const job=(await db.query<Record<string,unknown>>('SELECT * FROM reservation_emails WHERE reservation_id=$1',[id])).rows[0];
    assert.match(String(job.subject),locale==='pt'?/Reserva confirmada/:/Reservation confirmed/);
    assert.match(String(job.body),locale==='pt'?/Total acordado/:/Agreed total/);
    await queueReservationEmail(db,id,'changed','change-test-'+id);
    await queueReservationEmail(db,id,'changed','change-test-'+id);
    assert.equal((await db.query('SELECT * FROM reservation_emails WHERE reservation_id=$1',[id])).rows.length,2);
    // Keep only this job available to the worker in this isolated test database.
    await db.query("UPDATE reservation_emails SET available_at=now()+interval '1 day' WHERE id<>$1",[job.id]);
    await db.transaction(tx=>deliverReservationEmail(tx,async()=>{throw new EmailDeliveryError('rate_limit',300);}));
    const pending=(await db.query<{status:string;attempts:number;available_at:Date}>('SELECT * FROM reservation_emails WHERE id=$1',[job.id])).rows[0];
    assert.equal(pending.status,'queued');assert.equal(pending.attempts,1);assert.ok(new Date(pending.available_at).getTime()-Date.now()>295000);
    assert.equal((await db.query<{status:string}>('SELECT status FROM reservations WHERE id=$1',[id])).rows[0].status,'confirmed');
    assert.equal(await db.transaction(tx=>deliverReservationEmail(tx,async()=>assert.fail('must wait'))),false);
    await db.query('UPDATE reservation_emails SET available_at=now(),attempts=4 WHERE id=$1',[job.id]);
    await db.transaction(tx=>deliverReservationEmail(tx,async()=>{throw Error('test only');}));
    assert.equal((await db.query<{status:string}>('SELECT status FROM reservation_emails WHERE id=$1',[job.id])).rows[0].status,'failed');
    // Equivalent to the existing admin retry: same persisted ID and content.
    await db.query("UPDATE reservation_emails SET available_at=now(),attempts=0,status='queued' WHERE id=$1",[job.id]);
    await db.transaction(tx=>deliverReservationEmail(tx,async current=>{assert.equal(current.id,job.id);assert.equal(current.body,job.body);}));
    assert.equal((await db.query<{status:string}>('SELECT status FROM reservation_emails WHERE id=$1',[job.id])).rows[0].status,'sent');
  }
});
