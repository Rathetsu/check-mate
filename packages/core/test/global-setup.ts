// Vitest globalSetup: create the test database if needed and migrate it.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { baseDbUrl, testDbUrl } from './test-db.ts';

export default async function setup() {
  const admin = new pg.Client({ connectionString: baseDbUrl });
  await admin.connect();
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'checkmate_test'");
  if (!rowCount) await admin.query('CREATE DATABASE checkmate_test');
  await admin.end();

  const pool = new pg.Pool({ connectionString: testDbUrl });
  await migrate(drizzle({ client: pool }), { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  await pool.end();
}
