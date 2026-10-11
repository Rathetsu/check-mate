import { beforeEach, expect, test } from 'vitest';
import { getPreferences, putPreferences } from '../src/services/preferences.ts';
import { defaultPreferences } from '../src/shared/preferences.ts';
import { createUser, resetDb } from './helpers.ts';

beforeEach(resetDb);

test('a user without saved preferences gets the defaults', async () => {
  const id = await createUser();
  expect(await getPreferences(id)).toEqual(defaultPreferences);
});

test('saved preferences round-trip', async () => {
  const id = await createUser();
  const prefs = { ...defaultPreferences, pieceSet: 'merida' as const, theme: 'dark' as const, engineDepth: 24 };
  await putPreferences(id, prefs);
  expect(await getPreferences(id)).toEqual(prefs);
  await putPreferences(id, { ...prefs, pieceSet: 'mono' });
  expect((await getPreferences(id)).pieceSet).toBe('mono');
});

test("user B never sees user A's preferences (CORE-52)", async () => {
  const a = await createUser('A');
  const b = await createUser('B');
  await putPreferences(a, { ...defaultPreferences, pieceSet: 'merida' });
  expect(await getPreferences(b)).toEqual(defaultPreferences);
});
