import assert from'node:assert/strict';
import{test,before,after,beforeEach}from'node:test';
import{readFile,readdir}from'node:fs/promises';
import{randomUUID}from'node:crypto';
import{PGlite}from'@electric-sql/pglite';
import{telegramConfig,telegramSender,type TelegramConfig}from'../pms/telegram';
import{deliverAlerts,alertMessage,technicalAlerts,type AlertEvent}from'../pms/alert-worker';
const config:TelegramConfig={token:'123456789:test_token_not_real_000000000',chatId:'-123456789',from:new Date('2026-01-01Z'),site:'https://www.casasdobeco.com'};
test('Telegram requires explicit activation, fixed group and watermark; secrets remain server-side',()=>{
 const env={TELEGRAM_ALERTS_ENABLED:'true',TELEGRAM_BOT_TOKEN:config.token,TELEGRAM_CHAT_ID:config.chatId,TELEGRAM_ALERTS_FROM:config.from.toISOString(),PUBLIC_SITE_URL:config.site,NODE_ENV:'production'};
 assert.ok(telegramConfig(env));
 assert.equal(telegramConfig({...env,TELEGRAM_TECH_CHAT_ID:env.TELEGRAM_CHAT_ID},'technical'),null);
 assert.equal(telegramConfig({...env,TELEGRAM_TECH_CHAT_ID:'-987654321'},'technical')?.destination,'technical');
 for(const patch of [{TELEGRAM_ALERTS_ENABLED:'false'},{TELEGRAM_CHAT_ID:'123'},{TELEGRAM_CHAT_ID:'@someone'},{TELEGRAM_ALERTS_FROM:''},{TELEGRAM_BOT_TOKEN:''},{TELEGRAM_THREAD_ID:'-1'},{PUBLIC_SITE_URL:'http://insecure.example'},{PUBLIC_SITE_URL:'https://secret:pass@example.com'}])assert.equal(telegramConfig({...env,...patch}),null);
});
test('Telegram handles timeout, rate limits, permanent errors and migration without exposing provider details',async()=>{
 const responses=[{status:429,data:{ok:false,parameters:{retry_after:121}}},{status:403,data:{ok:false,description:'sensitive text'}},{status:400,data:{ok:false,parameters:{migrate_to_chat_id:-100123}}},{status:401,data:{ok:false}},{status:500,data:{ok:false}}];
 for(const input of responses){const send=telegramSender(config,(async()=>Response.json(input.data,{status:input.status})) as typeof fetch);const result=await send('test');assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes('sensitive'));if(!result.ok&&input.status===429)assert.equal(result.retryAfter,121);if(!result.ok&&input.status===400)assert.equal(result.code,'group_migrated');}
 assert.deepEqual(await telegramSender(config,(async()=>{throw Error('URL with secret');}) as typeof fetch)('test'),{ok:false,code:'network'});
 let captured:Record<string,unknown>={};const send=telegramSender({...config,threadId:23},(async(_url,opts)=>{captured=JSON.parse(String(opts?.body));assert.equal(opts?.redirect,'error');return Response.json({ok:true});}) as typeof fetch);
 assert.deepEqual(await send('test'),{ok:true});assert.equal(captured.chat_id,config.chatId);assert.equal(captured.message_thread_id,23);assert.equal(captured.protect_content,true);assert.equal(captured.parse_mode,undefined);
});
test('technical failures notify only after repetition, throttle and report recovery; no SQL dependency',async()=>{
 let clock=100000;const messages:string[]=[];const report=technicalAlerts(async text=>{messages.push(text);return{ok:true};},config.site,()=>clock);
 await report(false);assert.equal(messages.length,0);clock+=30000;await report(false);assert.equal(messages.length,1);
 for(let i=0;i<5;i++){clock+=30000;await report(false);}assert.equal(messages.length,1);
 await report(true);assert.equal(messages.length,2);assert.ok(messages[1].includes('RECUPERADO'));await report(true);assert.equal(messages.length,2);
});
const db=new PGlite();
before(async()=>{const dir=new URL('../pms/migrations/',import.meta.url);for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));});
after(()=>db.close());
beforeEach(async()=>{await db.exec('TRUNCATE alert_events,alert_delivery_channels');});
async function event(state='test',kind='system',entity='system',date='2026-10-15Z',destination='operations'){
 return(await db.query<AlertEvent>("INSERT INTO alert_events(kind,entity_type,entity_id,state,created_at,destination) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[kind,entity,randomUUID(),state,date,destination])).rows[0];
}
async function unlock(){await db.exec("UPDATE alert_delivery_channels SET next_attempt_at=now()-interval '1 minute';UPDATE alert_events SET available_at=now()-interval '1 minute'");}
test('outbox skips history/noisy states, batches at most ten and records delivery without guest payloads',async()=>{
 await event('test','system','system','2025-01-01Z');await event('pending_checkout','reservation','reservations');
 for(let i=0;i<12;i++)await event();const messages:string[]=[];const send=async(text:string)=>{messages.push(text);return{ok:true} as const;};
 await deliverAlerts(db,config,send);assert.equal(messages.length,1);assert.ok(messages[0].startsWith('[CASAS DO BECO'));assert.ok(messages[0].length<4096);
 let rows=(await db.query<{delivery_status:string;count:number}>('SELECT delivery_status,count(*)::int AS count FROM alert_events GROUP BY delivery_status')).rows;
 assert.equal(rows.find(r=>r.delivery_status==='skipped')?.count,2);assert.equal(rows.find(r=>r.delivery_status==='sent')?.count,9);
 await deliverAlerts(db,config,send);assert.equal(messages.length,1,'channel cooldown prevents flooding');
 await unlock();await deliverAlerts(db,config,send);assert.equal(messages.length,2);assert.equal((await db.query("SELECT * FROM alert_events WHERE delivery_status='sent'")).rows.length,12);
 const rendered=alertMessage([{...await event(),guest_email:'never@example.invalid',guest_name:'Never leak'} as AlertEvent],config.site);assert.ok(!rendered.includes('never@example'));assert.ok(!rendered.includes('Never leak'));assert.ok(!rendered.includes(config.token));
});
test('retry_after persists across restarts, exhausted rows stop and lost leases recover',async()=>{
 const e=await event();await deliverAlerts(db,config,async()=>({ok:false,code:'rate_limit',retryAfter:900}));
 const row=(await db.query<{attempts:number;delivery_status:string;last_error_code:string;available_at:Date}>('SELECT * FROM alert_events WHERE id=$1',[e.id])).rows[0];assert.equal(row.attempts,1);assert.equal(row.delivery_status,'pending');assert.equal(row.last_error_code,'rate_limit');assert.ok(new Date(String(row.available_at)).getTime()>Date.now()+850000);
 let calls=0;await deliverAlerts(db,config,async()=>{calls++;return{ok:true};});assert.equal(calls,0);
 await db.query("UPDATE alert_events SET delivery_status='sending',lease_until=now()-interval '1 minute',attempts=7 WHERE id=$1",[e.id]);await unlock();
 await deliverAlerts(db,config,async()=>({ok:false,code:'network'}));assert.equal((await db.query<{delivery_status:string;attempts:number}>('SELECT delivery_status,attempts FROM alert_events WHERE id=$1',[e.id])).rows[0].delivery_status,'dead');
 await unlock();await deliverAlerts(db,config,async()=>{calls++;return{ok:true};});assert.equal(calls,0);
 const recovery=await event();await db.query("UPDATE alert_events SET delivery_status='sending',lease_until=now()-interval '1 minute' WHERE id=$1",[recovery.id]);await unlock();await deliverAlerts(db,config,async()=>({ok:true}));assert.equal((await db.query<{delivery_status:string}>('SELECT delivery_status FROM alert_events WHERE id=$1',[recovery.id])).rows[0].delivery_status,'sent');
});
test('forbidden group pauses channel, never chooses a new destination; explicit reset resumes',async()=>{
 await event();await deliverAlerts(db,config,async()=>({ok:false,code:'forbidden',permanent:true}));let calls=0;
 await unlock();await deliverAlerts(db,config,async()=>{calls++;return{ok:true};});assert.equal(calls,0);assert.equal((await db.query<{blocked_reason:string}>('SELECT blocked_reason FROM alert_delivery_channels')).rows[0].blocked_reason,'forbidden');
 await db.exec('UPDATE alert_delivery_channels SET blocked_reason=NULL');await deliverAlerts(db,config,async()=>{calls++;return{ok:true};});assert.equal(calls,1);
});
test('technical and operational queues have separate destinations, content and leases',async()=>{
 await event('confirmed','reservation','reservations');
 await event('failed','reservation_email','reservation_emails','2026-10-15Z','technical');
 await event('failed','reservation_email','reservation_emails'); // Misrouted rows are filtered, not leaked.
 const operations:string[]=[],technical:string[]=[];
 await Promise.all([
  deliverAlerts(db,config,async text=>{operations.push(text);return{ok:true};}),
  deliverAlerts(db,{...config,destination:'technical',chatId:'-987654321'},async text=>{technical.push(text);return{ok:true};}),
 ]);
 assert.equal(operations.length,1);assert.equal(technical.length,1);
 assert.ok(operations[0].includes('OPERAÇÕES'));assert.ok(operations[0].includes('Reserva'));assert.ok(!operations[0].includes('Email'));
 assert.ok(technical[0].includes('TÉCNICO'));assert.ok(technical[0].includes('Email'));assert.ok(!technical[0].includes('Reserva'));
 assert.equal((await db.query('SELECT * FROM alert_delivery_channels')).rows.length,2);
 assert.equal((await db.query("SELECT * FROM alert_events WHERE delivery_status='skipped'")).rows.length,1);
});
