// P1-AC-01 username rules, through the real Better Auth instance.
// Sign-ups call the Have I Been Pwned range API (network).
import { eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { auth } from '../src/auth.ts';
import { db } from '../src/db.ts';
import { user } from '../src/schema/index.ts';
import { resetDb } from './helpers.ts';

const password = 'correct horse battery staple 42';
let n = 0;
const signUp = (username: string) =>
  auth.api.signUpEmail({
    body: { email: `u${++n}@example.com`, password, name: 'Test', username },
    headers: new Headers({ 'x-forwarded-for': `10.0.0.${n}` }),
    returnHeaders: true,
  });

beforeEach(resetDb);

test('usernames are unique case-insensitively and keep their display casing', async () => {
  await signUp('Magnus_C');
  await expect(signUp('magnus_c')).rejects.toThrow();
  const [row] = await db.select().from(user);
  expect(row).toMatchObject({ username: 'magnus_c', displayUsername: 'Magnus_C' });
});

test.each(['a', 'x'.repeat(21), 'has.dot', 'has space', 'émile'])('rejects invalid username %j', async (name) => {
  await expect(signUp(name)).rejects.toThrow();
});

test('accepts Lichess-style usernames', async () => {
  await expect(signUp('ab')).resolves.toBeDefined();
  await expect(signUp('Dr-Who_2026')).resolves.toBeDefined();
});

test('a username cannot be changed after sign-up', async () => {
  const { headers } = await signUp('first_name');
  const cookie = headers.get('set-cookie') ?? '';
  await auth.api.updateUser({ body: { username: 'second_name' }, headers: new Headers({ cookie }) }).catch(() => {});
  const [row] = await db.select({ username: user.username }).from(user).where(eq(user.displayUsername, 'first_name'));
  expect(row?.username).toBe('first_name');
});
