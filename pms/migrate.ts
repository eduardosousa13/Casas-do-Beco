import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { database } from './db';

const files = ['001_initial.sql', '002_refund_history.sql', '003_admin_auth.sql', '004_admin_configuration.sql', '005_auth_email.sql', '006_room_details.sql', '009_owner_operations.sql', '010_checkout_recovery.sql', '011_alert_outbox.sql', '012_telegram_delivery.sql', '013_alert_destinations.sql','014_contact_messages.sql'];
const db = database();
const client = await db.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(92741001)');
  await client.query(`CREATE TABLE IF NOT EXISTS pms_migrations (
    version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  for (const file of files) {
    const version = Number(file.slice(0, 3));
    const exists = await client.query('SELECT 1 FROM pms_migrations WHERE version = $1', [version]);
    if (exists.rowCount) continue;
    const sql = await readFile(fileURLToPath(new URL(`./migrations/${file}`, import.meta.url)), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO pms_migrations (version) VALUES ($1)', [version]);
    process.stdout.write(`Applied PMS migration ${file}\n`);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await db.end();
}
