import { betterAuth } from 'better-auth';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { authOptions } from './auth';
import { database } from './db';

if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Execute num terminal interativo. Nunca passe a palavra-passe por argumentos.');
let hidden = false;
const output = new Writable({ write(chunk, _encoding, callback) { if (!hidden) process.stdout.write(chunk); callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: true });
const db = database();
const lock = await db.connect();
try {
  await lock.query('SELECT pg_advisory_lock(92741002)');
  const existing = await lock.query("SELECT 1 FROM pms_staff WHERE role = 'owner' LIMIT 1");
  if (existing.rowCount) throw new Error('Já existe um proprietário. A criação de equipa será feita pelo painel.');
  const name = (await prompt.question('Nome do proprietário: ')).trim();
  const email = (await prompt.question('Email de acesso: ')).trim();
  process.stdout.write('Palavra-passe (mínimo 12 caracteres; entrada oculta): ');
  hidden = true;
  const password = await prompt.question('');
  hidden = false;
  process.stdout.write('\n');
  process.stdout.write('Confirmar palavra-passe (entrada oculta): ');
  hidden = true;
  const confirmation = await prompt.question('');
  hidden = false;
  process.stdout.write('\n');
  if (confirmation !== password) throw new Error('As palavras-passe não coincidem. Nenhuma conta criada.');
  const result = await betterAuth(authOptions(true)).api.signUpEmail({ body: { name, email, password } });
  await lock.query('BEGIN');
  await lock.query("INSERT INTO pms_staff(user_id, role) VALUES ($1, 'owner')", [result.user.id]);
  await lock.query("DELETE FROM pms_auth_session WHERE \"userId\" = $1", [result.user.id]);
  await lock.query("INSERT INTO audit_log(actor, action, entity_type, entity_id) VALUES ($1, 'owner.bootstrap', 'staff', $1)", [result.user.id]);
  await lock.query('COMMIT');
  process.stdout.write('Conta criada. Inicie sessão em /admin/login e configure o segundo fator.\n');
} catch (error) {
  await lock.query('ROLLBACK');
  throw error;
} finally {
  await lock.query('SELECT pg_advisory_unlock(92741002)');
  prompt.close();
  lock.release();
  await db.end();
}
