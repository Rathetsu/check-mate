// CORE-50 / P1-AC-10. Both tests discover user-owned tables from the
// database itself, so every table added later is covered automatically.
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../src/db.ts';
import {
  account,
  analysisSessions,
  externalAccounts,
  session,
  studies,
  user,
  userPreferences,
} from '../src/schema/index.ts';
import { defaultPreferences } from '../src/shared/preferences.ts';
import { createUser, resetDb } from './helpers.ts';

// One row per user-owned table. A new table with a `user_id` column fails the
// test until it gets a seeder here.
const seeders: Record<string, (userId: string) => Promise<unknown>> = {
  session: (userId) =>
    db.insert(session).values({
      id: randomUUID(),
      userId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 1e6),
      updatedAt: new Date(),
    }),
  account: (userId) =>
    db
      .insert(account)
      .values({ id: randomUUID(), userId, accountId: userId, providerId: 'credential', updatedAt: new Date() }),
  user_preferences: (userId) => db.insert(userPreferences).values({ userId, ...defaultPreferences }),
  external_accounts: (userId) =>
    db.insert(externalAccounts).values({ userId, platform: 'lichess', username: 'someone' }),
  analysis_sessions: (userId) =>
    db.insert(analysisSessions).values({ userId, sourceType: 'free', initialFen: 'x', pgn: '*', lastPositionKey: 'x' }),
  studies: (userId) => db.insert(studies).values({ userId, name: 'S' }),
};

async function userOwnedTables(): Promise<string[]> {
  const { rows } = await db.execute<{ table_name: string }>(
    sql`SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id' ORDER BY table_name`,
  );
  return rows.map((r) => r.table_name);
}

beforeEach(resetDb);

test('every user_id column is a FK to user with ON DELETE CASCADE', async () => {
  const { rows } = await db.execute<{ table_name: string }>(sql`
    SELECT cl.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
    WHERE con.contype = 'f' AND con.confrelid = '"user"'::regclass AND con.confdeltype = 'c' AND a.attname = 'user_id'`);
  expect(rows.map((r) => r.table_name).sort()).toEqual(await userOwnedTables());
});

test('deleting a user removes their rows from every user-owned table', async () => {
  const tables = await userOwnedTables();
  expect(
    tables.filter((t) => !seeders[t]),
    'tables without a seeder',
  ).toEqual([]);

  const doomed = await createUser('A');
  const kept = await createUser('B');
  for (const t of tables) {
    await seeders[t]!(doomed);
    await seeders[t]!(kept);
  }

  await db.delete(user).where(eq(user.id, doomed));

  for (const t of tables) {
    const { rows } = await db.execute<{ user_id: string }>(sql.raw(`SELECT user_id FROM "${t}"`));
    expect(
      rows.map((r) => r.user_id),
      t,
    ).toEqual([kept]);
  }
});
