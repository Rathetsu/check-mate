// Studies 4.3 (studies spec): members, roles, live ops.
import { TreeCursor } from '@checkmate/chess';
import { eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../src/db.ts';
import { subscribe, type StudyEvent } from '../src/pubsub.ts';
import { user } from '../src/schema/index.ts';
import { studyAccess } from '../src/services/study-access.ts';
import {
  inviteMember,
  removeMember,
  respondToInvite,
  setMemberRole,
  MAX_MEMBERS,
} from '../src/services/study-members.ts';
import { applyChapterOp, createStudy, getChapter, getStudy, listStudies } from '../src/services/studies.ts';
import { createUser, resetDb } from './helpers.ts';

beforeEach(resetDb);

const E4 = TreeCursor.fromFen().addNode('', 'e2e4');
const name = async (id: string) => (await db.select({ u: user.username }).from(user).where(eq(user.id, id)))[0]!.u!;

test('an invite gives no access until accepted; declining removes it (P1-ST-30)', async () => {
  const owner = await createUser('O');
  const b = await createUser('B');
  const s = await createStudy(owner, 'Team');
  await inviteMember(owner, s.id, (await name(b)).toUpperCase(), 'contributor'); // usernames ignore case
  expect((await studyAccess(b, s.id)).role).toBe('none');
  expect((await listStudies(b, { tab: 'invites' })).map((x) => x.name)).toEqual(['Team']);
  await expect(inviteMember(owner, s.id, await name(b), 'viewer')).rejects.toMatchObject({ status: 409 });
  await respondToInvite(b, s.id, true);
  expect((await studyAccess(b, s.id)).role).toBe('contributor');
  expect((await listStudies(b, { tab: 'member' })).map((x) => x.name)).toEqual(['Team']);
  expect((await getStudy(b, s.id)).members.map((m) => m.status)).toEqual(['active']);
  await expect(respondToInvite(b, s.id, true)).rejects.toMatchObject({ status: 404 });

  const c = await createUser('C');
  await inviteMember(owner, s.id, await name(c), 'viewer');
  await respondToInvite(c, s.id, false);
  expect((await studyAccess(c, s.id)).role).toBe('none');
});

test('only the owner manages members; unknown names and self-invites are refused', async () => {
  const owner = await createUser('O');
  const b = await createUser('B');
  const s = await createStudy(owner, 'Team');
  await expect(inviteMember(owner, s.id, 'nobody-here', 'viewer')).rejects.toMatchObject({ status: 404 });
  await expect(inviteMember(owner, s.id, await name(owner), 'viewer')).rejects.toMatchObject({ status: 400 });
  await expect(inviteMember(b, s.id, await name(owner), 'viewer')).rejects.toMatchObject({ status: 404 });
});

test('a viewer reads but cannot apply ops; a removed member gets a 404', async () => {
  const owner = await createUser('O');
  const v = await createUser('V');
  const s = await createStudy(owner, 'Team');
  await inviteMember(owner, s.id, await name(v), 'viewer');
  await respondToInvite(v, s.id, true);
  expect((await getChapter(v, s.id, s.chapterId)).pgn).toBeTruthy();
  await expect(applyChapterOp(v, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e4' })).rejects.toMatchObject({
    status: 403,
  });
  await setMemberRole(owner, s.id, v, 'contributor');
  await applyChapterOp(v, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e4' });
  await removeMember(owner, s.id, v);
  await expect(getStudy(v, s.id)).rejects.toMatchObject({ status: 404 });
});

test('a member can leave; the cap is 30 members', async () => {
  const owner = await createUser('O');
  const s = await createStudy(owner, 'Big');
  const ids = await Promise.all(Array.from({ length: MAX_MEMBERS }, (_, i) => createUser(`M${i}`)));
  for (const id of ids) await inviteMember(owner, s.id, await name(id), 'viewer');
  const extra = await createUser('X');
  await expect(inviteMember(owner, s.id, await name(extra), 'viewer')).rejects.toMatchObject({
    code: 'TOO_MANY_MEMBERS',
  });
  await respondToInvite(ids[0]!, s.id, true);
  await removeMember(ids[0]!, s.id, ids[0]!); // leaving
  expect((await studyAccess(ids[0]!, s.id)).role).toBe('none');
});

test('two editors at once: ops serialize and publish in version order', async () => {
  const owner = await createUser('O');
  const b = await createUser('B');
  const s = await createStudy(owner, 'Live');
  await inviteMember(owner, s.id, await name(b), 'contributor');
  await respondToInvite(b, s.id, true);
  const seen: number[] = [];
  const unsubscribe = subscribe(s.id, {
    userId: null,
    member: false,
    send: (e: StudyEvent) => e.type === 'op' && seen.push(e.version),
    close: () => {},
  });
  await Promise.all(
    ['e2e4', 'd2d4', 'c2c4', 'g1f3', 'b1c3', 'f2f4'].map((uci, i) =>
      applyChapterOp(i % 2 ? b : owner, s.id, s.chapterId, { op: 'addNode', path: '', uci }),
    ),
  );
  unsubscribe();
  expect(seen).toEqual([...seen].sort((x, y) => x - y));
  expect(seen).toHaveLength(6);
  expect((await getChapter(owner, s.id, s.chapterId)).pgn.match(/\(/g)).toHaveLength(5); // 6 first moves: 5 variations
});

test('setNags from two users converges: the last full set wins, no toggling', async () => {
  const owner = await createUser('O');
  const b = await createUser('B');
  const s = await createStudy(owner, 'Glyphs');
  await inviteMember(owner, s.id, await name(b), 'contributor');
  await respondToInvite(b, s.id, true);
  await applyChapterOp(owner, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e4' });
  await Promise.all([
    applyChapterOp(owner, s.id, s.chapterId, { op: 'setNags', path: E4, nags: [1] }),
    applyChapterOp(b, s.id, s.chapterId, { op: 'setNags', path: E4, nags: [1] }),
  ]);
  expect((await getChapter(owner, s.id, s.chapterId)).pgn).toContain('1. e4 $1 *');
});

test("comments are one per author, and a deleted member's stays as Deleted user (P1-ST-33)", async () => {
  const owner = await createUser('O');
  const b = await createUser('B');
  const s = await createStudy(owner, 'Notes');
  await inviteMember(owner, s.id, await name(b), 'contributor');
  await respondToInvite(b, s.id, true);
  await applyChapterOp(owner, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e4' });
  await applyChapterOp(owner, s.id, s.chapterId, { op: 'setComment', path: E4, text: 'Mine' });
  await applyChapterOp(b, s.id, s.chapterId, { op: 'setComment', path: E4, text: 'Theirs' });
  const before = await getChapter(owner, s.id, s.chapterId);
  expect(Object.keys(before.authors).sort()).toEqual([owner, b].sort());
  await db.delete(user).where(eq(user.id, b));
  const after = await getChapter(owner, s.id, s.chapterId);
  expect(after.pgn).toContain('Theirs');
  expect(after.authors[b]).toBeNull();
});
