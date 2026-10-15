import pg from 'pg';
import type { Sql } from './core';

// A stay is a local calendar date, not an instant in the server timezone.
pg.types.setTypeParser(1082, value => value);

let pool: pg.Pool | undefined;

export function database(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  if (!pool) {
    pool = new pg.Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5000, statement_timeout: 15000, ...(process.env.DATABASE_SSL_CA ? {ssl:{ca:process.env.DATABASE_SSL_CA,rejectUnauthorized:true}} : {}) });
    // pg emits idle-client errors outside query promises. Keep the process alive
    // so the pool can reconnect and the worker can report database failures.
    pool.on('error', () => process.stderr.write('Ligação inativa à base interrompida; aguarda reconexão.\n'));
  }
  return pool;
}

export async function transaction<T>(work: (db: Sql) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
