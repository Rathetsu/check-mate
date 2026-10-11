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
  studyLikes,
  studyMembers,
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
  // A like needs a study to like; the user likes their own here.
  study_likes: async (userId) => {
    const [s] = await db.insert(studies).values({ userId, name: 'Liked' }).returning({ id: studies.id });
    await db.insert(studyLikes).values({ studyId: s!.id, userId });
  },
  // Membership in someone else's study is the realistic case; a study of
  // their own keeps the seeder self-contained.
  study_members: async (userId) => {
    const other = await createUser('Owner');
    const [s] = await db.insert(studies).values({ userId: other, name: 'Theirs' }).returning({ id: studies.id });
    await db.insert(studyMembers).values({ studyId: s!.id, userId, role: 'viewer', status: 'active' });
  },
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

  const count = async (t: string, userId: string) =>
    (await db.execute(sql.raw(`SELECT 1 FROM "${t}" WHERE user_id = '${userId}'`))).rows.length;
  const keptBefore = Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await count(t, kept)])));

  await db.delete(user).where(eq(user.id, doomed));

  // Some seeders add parent rows (a like needs a study), so counts, not lists.
  for (const t of tables) {
    expect(await count(t, doomed), `${t}: rows left for the deleted user`).toBe(0);
    expect(await count(t, kept), `${t}: the other user's rows`).toBe(keptBefore[t]);
  }
});
