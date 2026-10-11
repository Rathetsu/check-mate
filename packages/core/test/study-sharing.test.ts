// Studies 4.2 (studies spec): visibility × role, clone, likes, browse.
import { eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../src/db.ts';
import { studies, studyChapters, studyLikes, user } from '../src/schema/index.ts';
import { studyAccess } from '../src/services/study-access.ts';
import {
  cloneStudy,
  createChapters,
  createStudy,
  getStudy,
  likeStudy,
  listStudies,
  updateStudy,
} from '../src/services/studies.ts';
import { createUser, resetDb } from './helpers.ts';

beforeEach(resetDb);

test('visibility × role: who gets which role', async () => {
  const owner = await createUser('O');
  const other = await createUser('X');
  const { id } = await createStudy(owner, 'S');
  const roles = async () => Promise.all([owner, other, null].map(async (u) => (await studyAccess(u, id)).role));
  expect(await roles()).toEqual(['owner', 'none', 'none']);
  await updateStudy(owner, id, { visibility: 'unlisted' });
  expect(await roles()).toEqual(['owner', 'reader', 'reader']);
  await updateStudy(owner, id, { visibility: 'public' });
  expect(await roles()).toEqual(['owner', 'reader', 'reader']);
});

test('clone makes a private copy with every chapter, when allowed (P1-ST-20)', async () => {
  const owner = await createUser('O');
  const other = await createUser('X');
  const { id } = await createStudy(owner, 'Openings');
  await createChapters(owner, id, { source: { type: 'pgn', pgn: '1. e4 *\n\n1. d4 *' } });
  await updateStudy(owner, id, {
    visibility: 'public',
    topics: ['sicilian'],
    settings: { computer: true, cloneable: 'nobody', shareable: 'everyone', sticky: true },
  });
  await expect(cloneStudy(other, id)).rejects.toMatchObject({ status: 403 });
  expect(await cloneStudy(owner, id)).toHaveProperty('id'); // the owner always can

  await updateStudy(owner, id, {
    settings: { computer: true, cloneable: 'everyone', shareable: 'everyone', sticky: true },
  });
  const copy = await cloneStudy(other, id);
  const s = await getStudy(other, copy.id);
  expect(s.role).toBe('owner');
  expect(s.visibility).toBe('private');
  expect(s.name).toBe('Openings');
  expect(s.chapters.map((c) => c.name)).toEqual((await getStudy(owner, id)).chapters.map((c) => c.name));
});

test('like counts are computed, so a deleted liker leaves no stale count (P1-ST-21)', async () => {
  const owner = await createUser('O');
  const fans = await Promise.all(['F1', 'F2', 'F3'].map((n) => createUser(n)));
  const { id } = await createStudy(owner, 'Popular');
  await updateStudy(owner, id, { visibility: 'public' });
  for (const f of fans) await likeStudy(f, id, true);
  expect(await likeStudy(fans[0]!, id, true)).toEqual({ likes: 3, liked: true }); // liking twice is one like
  await db.delete(user).where(eq(user.id, fans[1]!));
  expect((await getStudy(owner, id)).likes).toBe(2);
  expect(await likeStudy(fans[0]!, id, false)).toEqual({ likes: 1, liked: false });
});

test('a private study cannot be liked by others', async () => {
  const owner = await createUser('O');
  const other = await createUser('X');
  const { id } = await createStudy(owner, 'Mine');
  await expect(likeStudy(other, id, true)).rejects.toMatchObject({ status: 404 });
});

test('lists: public, mine, liked; search, topic and the hot rank (P1-ST-22)', async () => {
  const a = await createUser('A');
  const b = await createUser('B');
  const fans = await Promise.all(['F1', 'F2', 'F3'].map((n) => createUser(n)));
  const old = await createStudy(a, 'Old but loved');
  const fresh = await createStudy(a, 'Fresh endgames');
  const hidden = await createStudy(a, 'Secret');
  await updateStudy(a, old.id, { visibility: 'public', topics: ['endgames'] });
  await updateStudy(a, fresh.id, { visibility: 'public', topics: ['endgames'] });
  await db
    .update(studies)
    .set({ createdAt: new Date(Date.now() - 2 * 86_400_000) })
    .where(eq(studies.id, old.id));
  // Three likes push "Old" forward by min(int(5·ln 3 + 1), 3) = 3 days: past "Fresh".
  for (const f of fans) await likeStudy(f, old.id, true);

  const names = async (...args: Parameters<typeof listStudies>) => (await listStudies(...args)).map((s) => s.name);
  expect(await names(null, { tab: 'public', sort: 'hot' })).toEqual(['Old but loved', 'Fresh endgames']);
  expect(await names(null, { tab: 'public', sort: 'newest' })).toEqual(['Fresh endgames', 'Old but loved']);
  expect(await names(null, { tab: 'public', q: 'endg' })).toEqual(['Fresh endgames']);
  expect(await names(null, { tab: 'public', q: '50%' })).toEqual([]); // LIKE wildcards are literal
  expect(await names(null, { tab: 'public', topic: 'endgames', sort: 'name' })).toEqual([
    'Fresh endgames',
    'Old but loved',
  ]);
  expect(await names(null, { tab: 'mine' })).toEqual([]);
  expect(await names(a, { tab: 'mine', sort: 'name' })).toEqual(['Fresh endgames', 'Old but loved', 'Secret']);
  expect(await names(fans[0]!, { tab: 'liked' })).toEqual(['Old but loved']);
  // A liked study that turns private drops out of the liker's list.
  await updateStudy(a, old.id, { visibility: 'private' });
  expect(await names(fans[0]!, { tab: 'liked' })).toEqual([]);
  expect(hidden.id).toBeTruthy();
  expect(b).toBeTruthy();
});

test("A and B like each other's studies; deleting A keeps B's study and removes A's", async () => {
  const a = await createUser('A');
  const b = await createUser('B');
  const sa = await createStudy(a, 'A study');
  const sb = await createStudy(b, 'B study');
  await updateStudy(a, sa.id, { visibility: 'public' });
  await updateStudy(b, sb.id, { visibility: 'public' });
  await likeStudy(a, sb.id, true);
  await likeStudy(b, sa.id, true);

  await db.delete(user).where(eq(user.id, a));

  expect((await getStudy(b, sb.id)).likes).toBe(0);
  await expect(getStudy(b, sa.id)).rejects.toMatchObject({ status: 404 });
  expect(await db.select().from(studyChapters).where(eq(studyChapters.studyId, sa.id))).toEqual([]);
  expect(await db.select().from(studyLikes)).toEqual([]);
});
