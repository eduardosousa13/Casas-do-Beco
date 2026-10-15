import pg from 'pg';
import type { Sql } from './core';

// A stay is a local calendar date, not an instant in the server timezone.
pg.types.setTypeParser(1082, value => value);

let pool: pg.Pool | undefined;

export function database(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  if (!pool) {
    pool = new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
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
