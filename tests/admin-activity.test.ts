import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { activityList, sessionList, revokeSession } from '../pms/activity';
const db = new PGlite();
before(async () => {
  const dir = new URL('../pms/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(file=>file.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file,dir),'utf8'));
});
after(()=>db.close());
const params = (values: Record<string,string> = {}) => new URLSearchParams(values);
async function entry(entity: string, details: object, action='configuration.updated', kind='house') {
  await db.query('INSERT INTO audit_log(actor,action,entity_type,entity_id,details) VALUES ($1,$2,$3,$4,$5)', ['local-test',action,kind,entity,JSON.stringify(details)]);
}
test('history reports actual differences, normalizes times and excludes unknown fields and events', async () => {
  const id=randomUUID();
  await entry(id,{before:{name:'Antigo',status:'draft',check_in_from:'15:00:00'},after:{name:'Novo',status:'active',check_in_from:'15:00',secret:'never-expose',token:'never-expose'}, rates:{before:[{stay_date:'2030-01-01',amount_cents:9000,token:'never-expose'}],after:{from:'2030-01-01',until:'2030-01-03',cents:9500}}});
  await entry(id,{secret:'never-expose'},'other.private.event');
  const result=await activityList(db,params({kind:'house',entity:id}));
  assert.equal(result.entries.length,1);
  assert.deepEqual(result.entries[0].changes.map(change=>change.key),['name','status']);
  assert.equal(result.entries[0].changes[0].before,'Antigo');
  assert.equal(result.entries[0].changes[0].after,'Novo');
  assert.equal(result.entries[0].rates?.cents,9500);
  assert.deepEqual(result.entries[0].rates?.before,[{date:'2030-01-01',cents:9000}]);
  assert.ok(!JSON.stringify(result).includes('never-expose'));
});
test('history cursor pages do not repeat entries and exclude newer entries from older pages', async () => {
  const id=randomUUID();
  for(let n=0;n<42;n++) await entry(id,{before:{name:`Nome ${n}`},after:{name:`Nome ${n+1}`}});
  const first=await activityList(db,params({kind:'house',entity:id}));
  assert.equal(first.entries.length,40); assert.ok(first.nextCursor);
  await entry(id,{after:{name:'Mais recente'}});
  const second=await activityList(db,params({kind:'house',entity:id,before:first.nextCursor!}));
  assert.equal(second.entries.length,2);assert.equal(second.nextCursor,null);
  assert.equal(new Set([...first.entries,...second.entries].map(row=>row.id)).size,42);
  for(const invalid of [{kind:'payment'}, {before:'0'}, {before:'1 OR 1=1'}, {before:'9999999999999999999999999'}, {kind:'house',entity:'bad'}, {kind:'staff',entity:id}]) await assert.rejects(activityList(db,params(invalid)));
});
test('security history omits raw event details', async () => {
  await entry(randomUUID(),{secret:'do-not-return',after:{name:'private-security-payload'}},'mfa.enrolled','staff');
  const result=await activityList(db,params({kind:'staff'}));
  assert.equal(result.entries.length,1);assert.deepEqual(result.entries[0].changes,[]);
  assert.ok(!JSON.stringify(result).includes('do-not-return'));
});
test('sessions isolate owners, omit tokens, exclude expired sessions and preserve current session', async () => {
  const first=randomUUID(), other=randomUUID();
  for(const id of [first,other]) await db.query('INSERT INTO pms_auth_user(id,name,email,"emailVerified") VALUES ($1,\'Test\',$2,false)',[id,`${id}@example.com`]);
  const current=randomUUID(), secondary=randomUUID(), foreign=randomUUID(), expired=randomUUID();
  for(const [id,user,expiry] of [[current,first,'2035-01-01'],[secondary,first,'2035-01-01'],[foreign,other,'2035-01-01'],[expired,first,'2020-01-01']]) await db.query('INSERT INTO pms_auth_session(id,"userId",token,"updatedAt","expiresAt","userAgent") VALUES ($1,$2,$3,now(),$4,\'Test browser\')',[id,user,`private-token-${id}`,expiry]);
  const result=await sessionList(db,first,current);
  assert.equal(result.sessions.length,2);assert.ok(result.sessions.find(row=>row.id===current)?.current);
  assert.ok(!JSON.stringify(result).includes('private-token'));
  await assert.rejects(db.transaction(tx=>revokeSession(tx,first,current,{id:current})),/Terminar sessão/);
  await db.transaction(tx=>revokeSession(tx,first,current,{id:foreign}));
  assert.equal((await db.query('SELECT 1 FROM pms_auth_session WHERE id=$1',[foreign])).rows.length,1);
  await db.transaction(tx=>revokeSession(tx,first,current,{id:secondary}));
  await db.transaction(tx=>revokeSession(tx,first,current,{id:secondary}));
  assert.equal((await sessionList(db,first,current)).sessions.length,1);
  assert.equal((await db.query("SELECT 1 FROM audit_log WHERE actor=$1 AND action='sessions.revoked'",[first])).rows.length,1);
  await assert.rejects(db.transaction(tx=>revokeSession(tx,first,current,{})),/inválida/);
});
test('audit failure rolls back the session revocation', async () => {
  const user=randomUUID(),session=randomUUID();
  await db.query('INSERT INTO pms_auth_user(id,name,email,"emailVerified") VALUES ($1,\'Test\',$2,false)',[user,`${user}@example.com`]);
  await db.query('INSERT INTO pms_auth_session(id,"userId",token,"updatedAt","expiresAt") VALUES ($1,$2,$3,now(),\'2035-01-01\')',[session,user,randomUUID()]);
  await db.exec("CREATE FUNCTION reject_session_audit() RETURNS trigger AS $$ BEGIN IF NEW.action='sessions.revoked' THEN RAISE EXCEPTION 'simulated audit failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql; CREATE TRIGGER reject_session_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_session_audit();");
  try { await assert.rejects(db.transaction(tx=>revokeSession(tx,user,'another-session',{id:session})),/simulated audit failure/); }
  finally { await db.exec('DROP TRIGGER reject_session_audit ON audit_log; DROP FUNCTION reject_session_audit();'); }
  assert.equal((await db.query('SELECT 1 FROM pms_auth_session WHERE id=$1',[session])).rows.length,1);
});
