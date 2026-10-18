import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {deliverEmail,emailConfiguration,EmailDeliveryError,EmailNotConfigured} from '../server/email';
import {sendRecoveryEmail} from '../pms/auth-email';
import {sendReservationEmail} from '../pms/reservation-email';
import {sendContactEmail} from '../server/send-contact';
import {contactHandler} from '../server/routes/contact';

const env={EMAIL_PROVIDER:'resend',EMAIL_FROM:'Casas do Beco <reservas@example.com>',EMAIL_REPLY_TO:'owner@example.com',RESEND_API_KEY:'re_test_only_not_a_real_key'};
const message={to:'guest@example.com',subject:'Reserva confirmada',text:'Teste sem envio real',idempotencyKey:'reservation/test-id'};
const accepted=()=>Response.json({id:'test-provider-id'});
function withEnv(t:TestContext) {
  for(const [key,value] of Object.entries({...env,CONTACT_TO_EMAIL:'owner@example.com'})){
    const original=process.env[key];process.env[key]=value;
    t.after(()=>{if(original===undefined)delete process.env[key];else process.env[key]=original;});
  }
}
test('email configuration requires explicit valid transport, sender and credentials',()=>{
  assert.equal(emailConfiguration({}),null);
  assert.equal(emailConfiguration({...env,RESEND_API_KEY:''}),null);
  assert.equal(emailConfiguration({...env,EMAIL_PROVIDER:'unknown'}),null);
  assert.equal(emailConfiguration({...env,EMAIL_FROM:'Owner\r\nBcc: other@example.com'}),null);
  assert.equal(emailConfiguration({...env,EMAIL_REPLY_TO:'a@example.com,b@example.com'}),null);
  const legacy={SMTP_HOST:'smtp.example.com',SMTP_USER:'owner@example.com',SMTP_PASSWORD:'test-only'};
  assert.equal(emailConfiguration(legacy)?.provider,'smtp');
  assert.equal(emailConfiguration({...legacy,SMTP_PORT:'65536'}),null);
});
test('Resend request uses fixed HTTPS endpoint, one recipient, reply-to and stable idempotency key',async()=>{
  const requests:RequestInit[]=[];
  const request:typeof fetch=async(url,options)=>{
    assert.equal(url,'https://api.resend.com/emails');requests.push(options!);return accepted();
  };
  for(let i=0;i<2;i++)assert.deepEqual(await deliverEmail(message,{env,request}),{provider:'resend',id:'test-provider-id'});
  assert.deepEqual(requests[0].headers,requests[1].headers);
  const headers=requests[0].headers as Record<string,string>;
  assert.equal(headers['Idempotency-Key'],message.idempotencyKey);
  assert.equal(headers.Authorization,'Bearer '+env.RESEND_API_KEY);
  assert.equal(requests[0].redirect,'error');assert.ok(requests[0].signal);
  assert.deepEqual(JSON.parse(String(requests[0].body)),{from:env.EMAIL_FROM,to:[message.to],subject:message.subject,text:message.text,reply_to:env.EMAIL_REPLY_TO});
});
test('invalid headers or multiple recipients never reach the provider',async()=>{
  const request:typeof fetch=async()=>assert.fail('invalid message must not send');
  for(const patch of [{to:'a@example.com,b@example.com'},{replyTo:'a@example.com\r\nBcc: b@example.com'},{subject:'hello\nBcc: b@example.com'},{idempotencyKey:'bad key'},{text:''}])await assert.rejects(deliverEmail({...message,...patch},{env,request}),EmailDeliveryError);
  await assert.rejects(deliverEmail(message,{env:{},request}),EmailNotConfigured);
});
test('rate limits respect Retry-After and provider errors never expose response content',async()=>{
  for(const [status,code] of [[429,'rate_limit'],[401,'rejected'],[503,'provider']] as const){
    await assert.rejects(deliverEmail(message,{env,request:async()=>new Response('secret-reset-url-and-guest-email',{status,headers:{'retry-after':'180'}})}),(error:EmailDeliveryError)=>{
      assert.equal(error.code,code);assert.equal(error.retryAfterSeconds,status===429?180:0);
      assert.ok(!String(error).includes('secret-reset'));assert.ok(!String(error).includes(message.to));return true;
    });
  }
  for(const value of ['not-a-date','-2','9999999'])await assert.rejects(deliverEmail(message,{env,request:async()=>new Response(null,{status:429,headers:{'retry-after':value}})}),(error:EmailDeliveryError)=>error.retryAfterSeconds>=30&&error.retryAfterSeconds<=86400);
});
test('network errors and malformed successes remain failures without leaking secrets',async()=>{
  await assert.rejects(deliverEmail(message,{env,request:async()=>{throw Error(env.RESEND_API_KEY);}}),(error:EmailDeliveryError)=>error.code==='network'&&!String(error).includes(env.RESEND_API_KEY));
  for(const body of [null,{}, {id:1},{id:'bad\nheader'}])await assert.rejects(deliverEmail(message,{env,request:async()=>Response.json(body)}),EmailDeliveryError);
  await assert.rejects(deliverEmail(message,{env,request:async()=>new Response('invalid json')}),EmailDeliveryError);
});
test('contact, recovery and reservation use the shared API with separate stable queue keys',async t=>{
  withEnv(t);
  const sent:{headers:Record<string,string>;body:Record<string,unknown>}[]=[];
  t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{sent.push({headers:options.headers as Record<string,string>,body:JSON.parse(String(options.body))});return accepted();});
  await sendContactEmail({nome:'Teste',email:'visitor@example.com',telefone:'',casa:'geral',mensagem:'Teste'},{id:'contact-id',recipient:'owner@example.com'});
  await sendRecoveryEmail({to:'owner@example.com',url:'https://example.com/admin/reset-password#token=test-only',id:'recovery-id'});
  await sendReservationEmail({recipient:'guest@example.com',subject:'Reservation confirmed',body:'Hello Guest',id:'reservation-id'});
  assert.deepEqual(sent[0].body.to,['owner@example.com']);assert.equal(sent[0].body.reply_to,'visitor@example.com');
  assert.match(sent[0].headers['Idempotency-Key'],/^contact\//);
  assert.equal(sent[1].headers['Idempotency-Key'],'recovery/recovery-id');assert.match(String(sent[1].body.text),/#token=test-only/);
  assert.equal(sent[2].headers['Idempotency-Key'],'reservation/reservation-id');assert.equal(sent[2].body.reply_to,'owner@example.com');
});
test('contact endpoint acknowledges only durable intake and sanitizes database errors',async t=>{
  withEnv(t);let outcome='accepted',stores=0;const logs:unknown[][]=[];
  t.mock.method(console,'error',(...args:unknown[])=>logs.push(args));
  t.mock.method(globalThis,'fetch',async()=>assert.fail('contact intake must not depend on email availability'));
  const contact=contactHandler(async()=>{stores++;if(outcome!=='accepted')throw Error('private-database-error');});
  const call=()=>contact({url:new URL('https://example.com/api/contact'),request:new Request('https://example.com/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nome:'Teste',email:'visitor@example.com',telefone:'',casa:'geral',mensagem:'Mensagem de teste'})}),clientAddress:'email-test'});
  assert.equal((await call()).status,200);
  outcome='failed';const failed=await call();assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('private-database-error'));
  assert.equal(JSON.stringify(logs),'[["Contact message storage failed"]]');
  outcome='accepted';delete process.env.RESEND_API_KEY;assert.equal((await call()).status,200);assert.equal(stores,3);
});
