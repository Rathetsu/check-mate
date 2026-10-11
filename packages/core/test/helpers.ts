import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../src/db.ts';
import { user } from '../src/schema/index.ts';

// Empties every app table. Migration history lives in the `drizzle` schema.
export async function resetDb() {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  if (rows.length) await db.execute(sql.raw(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} CASCADE`));
}

export async function createUser(name = 'Test') {
  const id = randomUUID();
  await db
    .insert(user)
    .values({ id, name, email: `${id}@example.com`, username: id.slice(0, 20), displayUsername: id.slice(0, 20) });
  return id;
}
