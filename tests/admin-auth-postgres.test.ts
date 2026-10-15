import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { once } from 'node:events';
import { transport } from '../server/transport';
import { handleApi,adminBootstrap } from '../server/app';
import pg from 'pg';
import { betterAuth } from 'better-auth';
import { base32 } from '@better-auth/utils/base32';
import { authOptions, authentication, staffSession } from '../pms/auth';
import { database } from '../pms/db';
import { sessionList, revokeSession } from '../pms/activity';
import { ALL as ownerRoute } from '../server/routes/admin/operations';
import { ALL as retiredConfiguration } from '../server/routes/admin/configuration';
import { deliverRecoveryEmail } from '../pms/auth-email';

test('real auth: closed registration, password + TOTP, recovery code, revoked sessions and persistent limits', async () => {
  const original = process.env.DATABASE_URL;
  const originalProxy=process.env.TRUST_RAILWAY_PROXY;process.env.TRUST_RAILWAY_PROXY='true';
  assert.ok(original, 'Configure a local DATABASE_URL');
  const url = new URL(original);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname), 'This test only runs on localhost');
  const schema = `auth_test_${randomUUID().replaceAll('-', '')}`;
  const control = new pg.Pool({ connectionString: original });
  await control.query(`CREATE SCHEMA ${schema}`);
  url.searchParams.set('options', `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
  process.env.PUBLIC_SITE_URL = 'http://localhost:3004';
  process.env.BETTER_AUTH_SECRET = randomUUID() + randomUUID();
  const pool = database();
  const wire=transport(handleApi);wire.listen(0,'127.0.0.1');await once(wire,'listening');
  const wireBase='http://127.0.0.1:'+(wire.address() as {port:number}).port;
  try {
    const dir = new URL('../pms/migrations/', import.meta.url);
    for (const file of (await readdir(dir)).filter(file => file.endsWith('.sql')).sort()) await pool.query(await readFile(new URL(file, dir), 'utf8'));
    const email = `${randomUUID()}@example.com`, password = `test-only-${randomUUID()}`;
    const owner = await betterAuth(authOptions(true)).api.signUpEmail({ body: { name: 'Test owner', email, password } });
    await pool.query("INSERT INTO pms_staff(user_id,role) VALUES ($1,'owner')", [owner.user.id]);
    const auth = authentication();
    const jar = new Map<string,string>();
    async function request(path: string, body?: unknown, origin = 'http://localhost:3004', ip = '127.0.0.1') {
      const headers = new Headers({ origin, 'x-forwarded-for': ip,'x-real-ip':ip, cookie: [...jar].map(([key,value]) => `${key}=${value}`).join('; ') });
      if (body) headers.set('content-type','application/json');
      const response = await fetch(`${wireBase}/api/auth${path}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
      for (const cookie of response.headers.getSetCookie()) { const [pair] = cookie.split(';'); const index=pair.indexOf('='); jar.set(pair.slice(0,index),pair.slice(index+1)); }
      return response;
    }
    const signed = () => new Request('http://localhost:3004/api/admin/configuration', { headers: { cookie: [...jar].map(([key,value]) => `${key}=${value}`).join('; ') } });
    assert.equal((await request('/sign-up/email', { name: 'Attacker', email: 'attacker@example.com', password })).status, 400);
    assert.equal((await request('/sign-in/email', { email, password }, 'https://attacker.example')).status, 403);
    assert.equal((await request('/sign-in/email', { email, password: 'wrong-password' })).status, 401);
    assert.equal((await request('/sign-in/email', { email, password })).status, 200);
    await assert.rejects(staffSession(signed()), /segundo fator/);
    const enabled = await request('/two-factor/enable', { password });
    assert.equal(enabled.status, 200);
    const setup = await enabled.json();
    const secret = new TextDecoder().decode(base32.decode(new URL(setup.totpURI).searchParams.get('secret')!));
    const code = await auth.api.generateTOTP({ body: { secret } });
    assert.equal((await request('/two-factor/verify-totp', { code: code.code })).status, 200);
    assert.equal((await staffSession(signed())).role, 'owner');
    assert.ok(!(await adminBootstrap(new Request('http://localhost:3004/admin',{headers:signed().headers})) instanceof Response));
    const ownerUrl=new URL('http://localhost:3004/api/admin/operations?view=summary');
    const authenticated=new Request(ownerUrl,{headers:signed().headers});
    assert.equal((await ownerRoute({request:authenticated,url:ownerUrl} as Parameters<typeof ownerRoute>[0])).status,200);
    assert.equal((await ownerRoute({request:new Request(ownerUrl),url:ownerUrl} as Parameters<typeof ownerRoute>[0])).status,401);
    assert.equal((await ownerRoute({request:new Request(ownerUrl,{method:'POST',headers:{...Object.fromEntries(signed().headers),origin:'https://attacker.example'},body:'{}'}),url:ownerUrl} as Parameters<typeof ownerRoute>[0])).status,403);
    assert.equal((await retiredConfiguration({request:authenticated,url:ownerUrl} as Parameters<typeof retiredConfiguration>[0])).status,410);

    assert.equal((await request('/sign-out', {})).status, 200);
    jar.clear();
    const challengeResponse = await request('/sign-in/email', { email, password }, 'http://localhost:3004', '127.0.0.3');
    assert.equal(challengeResponse.status, 200);
    const challenge = await challengeResponse.json();
    assert.equal(challenge.twoFactorRedirect, true);
    await assert.rejects(staffSession(signed()), /Inicie sessão/);
    assert.notEqual((await request('/two-factor/verify-totp', { code: '000000' })).status, 200);
    assert.equal((await request('/two-factor/verify-backup-code', { code: setup.backupCodes[0] })).status, 200);
    assert.equal((await staffSession(signed())).role, 'owner');
    assert.equal((await request('/revoke-sessions', {})).status, 200);
    await assert.rejects(staffSession(signed()), /Inicie sessão/);
    jar.clear();
    await request('/sign-in/email', { email, password }, 'http://localhost:3004', '127.0.0.4');
    assert.notEqual((await request('/two-factor/verify-backup-code', { code: setup.backupCodes[0] })).status, 200);
    const nextCode = await auth.api.generateTOTP({ body: { secret } });
    assert.equal((await request('/two-factor/verify-totp', { code: nextCode.code })).status, 200);

    // Replacement must reject a wrong password without deleting the existing factor.
    const before = (await pool.query('SELECT secret FROM pms_auth_two_factor WHERE "userId"=$1', [owner.user.id])).rows[0].secret;
    assert.notEqual((await request('/two-factor/disable', { password: 'wrong-password' })).status, 200);
    assert.equal((await pool.query('SELECT secret FROM pms_auth_two_factor WHERE "userId"=$1', [owner.user.id])).rows[0].secret, before);
    assert.equal((await staffSession(signed())).role, 'owner');
    const oldSession = signed();
    await pool.query('INSERT INTO pms_auth_session(id,"expiresAt",token,"createdAt","updatedAt","userId") SELECT $1,"expiresAt",$2,"createdAt","updatedAt","userId" FROM pms_auth_session WHERE "userId"=$3 LIMIT 1', [randomUUID(), randomUUID(), owner.user.id]);
    await pool.query('INSERT INTO pms_auth_verification(id,identifier,value,"expiresAt") VALUES ($1,$2,$3,now()+interval \'1 hour\')', [randomUUID(), `trust-device-${randomUUID()}`, owner.user.id]);
    assert.equal((await request('/two-factor/disable', { password })).status, 200);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM pms_auth_session WHERE "userId"=$1', [owner.user.id])).rows[0].count, 1);
    await assert.rejects(staffSession(oldSession), /Inicie sessão/);
    await assert.rejects(staffSession(signed()), /segundo fator/);
    assert.equal((await pool.query("SELECT 1 FROM pms_auth_verification WHERE value=$1 AND identifier LIKE 'trust-device-%'", [owner.user.id])).rows.length, 0);
    const replacement = await (await request('/two-factor/enable', { password })).json();
    const newSecret = new TextDecoder().decode(base32.decode(new URL(replacement.totpURI).searchParams.get('secret')!));
    assert.notEqual(newSecret, secret);
    // Password-only sessions opened while enrollment is pending cannot survive confirmation.
    const rotatingJar = new Map(jar);
    jar.clear();
    assert.equal((await request('/sign-in/email', { email, password }, 'http://localhost:3004', '127.0.0.6')).status, 200);
    const duringEnrollment = signed();
    jar.clear(); for (const [key,value] of rotatingJar) jar.set(key,value);
    const oldCode = await auth.api.generateTOTP({ body: { secret } });
    assert.notEqual((await request('/two-factor/verify-totp', { code: oldCode.code }, 'http://localhost:3004', '127.0.0.5')).status, 200);
    const newCode = await auth.api.generateTOTP({ body: { secret: newSecret } });
    assert.equal((await request('/two-factor/verify-totp', { code: newCode.code }, 'http://localhost:3004', '127.0.0.5')).status, 200);
    assert.equal((await staffSession(signed())).role, 'owner');
    await assert.rejects(staffSession(duringEnrollment), /Inicie sessão/);
    await request('/sign-out', {}); jar.clear();
    await request('/sign-in/email', { email, password }, 'http://localhost:3004', '127.0.0.7');
    assert.notEqual((await request('/two-factor/verify-backup-code', { code: setup.backupCodes[1] }, 'http://localhost:3004', '127.0.0.7')).status, 200);
    assert.equal((await request('/two-factor/verify-backup-code', { code: replacement.backupCodes[0] }, 'http://localhost:3004', '127.0.0.7')).status, 200);
    assert.ok((await pool.query("SELECT 1 FROM audit_log WHERE actor=$1 AND action='mfa.replacement_started'", [owner.user.id])).rows.length);
    // A real authenticated cookie loses access immediately after scoped revocation.
    const originalJar = new Map(jar), originalRequest = signed();
    const originalActor = await staffSession(originalRequest);
    jar.clear();
    await request('/sign-in/email', { email, password }, 'http://localhost:3004', '127.0.0.8');
    assert.equal((await request('/two-factor/verify-backup-code', { code: replacement.backupCodes[1] }, 'http://localhost:3004', '127.0.0.8')).status, 200);
    const secondaryRequest = signed(), secondaryActor = await staffSession(secondaryRequest);
    assert.notEqual(secondaryActor.sessionId, originalActor.sessionId);
    assert.equal((await sessionList(pool,owner.user.id,originalActor.sessionId)).sessions.length,2);
    // Use one checked-out connection for the transaction, as the API does.
    const client = await pool.connect();
    try { await client.query('BEGIN'); await revokeSession(client,owner.user.id,originalActor.sessionId,{id:secondaryActor.sessionId}); await client.query('COMMIT'); }
    catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    await assert.rejects(staffSession(secondaryRequest),/Inicie sessão/);
    assert.equal((await staffSession(originalRequest)).sessionId,originalActor.sessionId);
    jar.clear(); for(const [key,value] of originalJar) jar.set(key,value);
    // Recovery uses only a fictitious account and a delivery stub, never SMTP.
    const smtpNames=['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','SMTP_PORT'] as const;
    const smtpOriginal=Object.fromEntries(smtpNames.map(name=>[name,process.env[name]]));
    try {
      process.env.SMTP_PASSWORD='';
      assert.equal((await request('/request-password-reset',{email},'http://localhost:3004','127.0.0.10')).status,503);
      assert.equal((await request('/request-password-reset',{email:'missing@example.com'},'http://localhost:3004','127.0.0.11')).status,503);
      process.env.SMTP_HOST='test.invalid';process.env.SMTP_USER='test@example.com';process.env.SMTP_PASSWORD='test-only';process.env.SMTP_PORT='465';
      const recoveryBody={email,redirectTo:'/admin/reset-password'};
      assert.equal((await request('/request-password-reset',{...recoveryBody,redirectTo:'https://attacker.example'},'http://localhost:3004','127.0.0.12')).status,403);
      const known=await request('/request-password-reset',recoveryBody,'http://localhost:3004','127.0.0.13');
      const unknown=await request('/request-password-reset',{...recoveryBody,email:'missing@example.com'},'http://localhost:3004','127.0.0.14');
      assert.equal(known.status,200);assert.equal(unknown.status,200);
      assert.deepEqual(await known.json(),await unknown.json());
      let mail:{to:string;url:string;id:string}|undefined;
      const worker=await pool.connect();
      try { await worker.query('BEGIN'); await deliverRecoveryEmail(worker,async message=>{mail=message;}); await worker.query('COMMIT'); }
      finally {worker.release();}
      assert.equal(mail!.to,email);
      const link=new URL(mail!.url);assert.equal(link.pathname,'/admin/reset-password');assert.equal(link.search,'');
      const token=new URLSearchParams(link.hash.slice(1)).get('token')!;
      assert.ok(token);assert.equal((await pool.query('SELECT payload FROM auth_email_jobs WHERE id=$1',[mail!.id])).rows[0].payload,null);
      await request('/request-password-reset',recoveryBody,'http://localhost:3004','127.0.0.15');
      assert.equal((await request('/reset-password',{token,newPassword:'short'},'http://localhost:3004','127.0.0.16')).status,400);
      assert.equal((await request('/reset-password',{token:'invalid',newPassword:password},'http://localhost:3004','127.0.0.17')).status,400);
      const recoveredPassword=`recovered-test-${randomUUID()}`;
      const responses=await Promise.all([
        request('/reset-password',{token,newPassword:recoveredPassword},'http://localhost:3004','127.0.0.18'),
        request('/reset-password',{token,newPassword:recoveredPassword},'http://localhost:3004','127.0.0.19')]);
      assert.deepEqual(responses.map(response=>response.status).sort(),[200,400]);
      await assert.rejects(staffSession(originalRequest),/Inicie sessão/);
      assert.equal((await pool.query('SELECT 1 FROM pms_auth_session WHERE "userId"=$1',[owner.user.id])).rows.length,0);
      assert.equal((await pool.query("SELECT 1 FROM pms_auth_verification WHERE value=$1 AND identifier LIKE 'reset-password:%'",[owner.user.id])).rows.length,0);
      assert.equal((await pool.query("SELECT 1 FROM auth_email_jobs WHERE user_id=$1 AND status='queued'",[owner.user.id])).rows.length,0);
      assert.equal((await pool.query('SELECT "twoFactorEnabled" FROM pms_auth_user WHERE id=$1',[owner.user.id])).rows[0].twoFactorEnabled,true);
      assert.equal((await pool.query("SELECT 1 FROM audit_log WHERE actor=$1 AND action='password.recovered'",[owner.user.id])).rows.length,1);
      jar.clear();
      assert.equal((await request('/sign-in/email',{email,password},'http://localhost:3004','127.0.0.20')).status,401);
      const login=await request('/sign-in/email',{email,password:recoveredPassword},'http://localhost:3004','127.0.0.21');
      assert.equal(login.status,200);assert.equal((await login.json()).twoFactorRedirect,true);
      await assert.rejects(staffSession(signed()),/Inicie sessão/);
      assert.equal((await request('/two-factor/verify-backup-code',{code:replacement.backupCodes[2]},'http://localhost:3004','127.0.0.21')).status,200);
      await request('/request-password-reset',recoveryBody,'http://localhost:3004','127.0.0.22');
      const expired=(await pool.query("UPDATE pms_auth_verification SET \"expiresAt\"=now()-interval '1 second' WHERE value=$1 AND identifier LIKE 'reset-password:%' RETURNING identifier",[owner.user.id])).rows[0].identifier.slice('reset-password:'.length);
      assert.equal((await request('/reset-password',{token:expired,newPassword:password},'http://localhost:3004','127.0.0.23')).status,400);
    } finally { for(const name of smtpNames) { if(smtpOriginal[name]===undefined) delete process.env[name];else process.env[name]=smtpOriginal[name]; } }
    await pool.query('UPDATE pms_staff SET enabled=false WHERE user_id=$1', [owner.user.id]);
    await assert.rejects(staffSession(signed()), /permissão/);
    let limited = false;
    for (let i=0; i<35; i++) { if ((await request('/sign-in/email', { email, password: 'wrong-password' }, 'http://localhost:3004', '127.0.0.2')).status === 429) { limited=true; break; } }
    assert.equal(limited, true);
    assert.ok((await pool.query('SELECT count(*)::int AS count FROM pms_auth_rate_limit')).rows[0].count > 0);
  } finally {
    wire.closeAllConnections();await new Promise<void>(resolve=>wire.close(()=>resolve()));
    await pool.end();
    await control.query(`DROP SCHEMA ${schema} CASCADE`);
    await control.end();
    process.env.DATABASE_URL = original;
    if(originalProxy===undefined)delete process.env.TRUST_RAILWAY_PROXY;else process.env.TRUST_RAILWAY_PROXY=originalProxy;
  }
});
