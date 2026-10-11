// Analysis sessions (P1-AN-30..33): CRUD, user scoping, the purge.
import { eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../src/db.ts';
import { analysisSessions } from '../src/schema/index.ts';
import {
  createAnalysisSession,
  findAnalysisSession,
  getAnalysisSession,
  latestAnalysisSession,
  patchAnalysisSession,
  purgeFreeAnalysisSessions,
} from '../src/services/analysis-sessions.ts';
import { createUser, resetDb } from './helpers.ts';

beforeEach(resetDb);

const PGN = '1. e4 e5 2. Nf3 *';

test('create, patch, find and resume where the user left off', async () => {
  const a = await createUser();
  const { id } = await createAnalysisSession(a, { sourceType: 'upload', sourceId: 'sha' }, { pgn: PGN, lastPath: '' });
  await patchAnalysisSession(a, id, { pgn: '1. e4 e5 2. Nf3 Nc6 *', lastPath: 'zz' }); // a gone path resumes at the root
  const s = await getAnalysisSession(a, id);
  expect(s.pgn).toContain('Nc6');
  expect(s.lastPath).toBe('');
  expect((await findAnalysisSession(a, 'upload', 'sha'))?.id).toBe(id);
  expect(await findAnalysisSession(a, 'upload', 'other')).toBeNull();
  expect((await latestAnalysisSession(a))?.id).toBe(id);
});

test("another user's session is a 404, whatever the call", async () => {
  const a = await createUser('A');
  const b = await createUser('B');
  const { id } = await createAnalysisSession(a, { sourceType: 'free', sourceId: null }, { pgn: PGN, lastPath: '' });
  await expect(getAnalysisSession(b, id)).rejects.toMatchObject({ status: 404 });
  await expect(patchAnalysisSession(b, id, { pgn: PGN, lastPath: '' })).rejects.toMatchObject({ status: 404 });
  await expect(getAnalysisSession(a, 'not-a-uuid')).rejects.toMatchObject({ status: 404 });
  expect(await findAnalysisSession(b, 'free', null)).toBeNull();
});

test('the PGN must load through the rules layer', async () => {
  const a = await createUser();
  await expect(
    createAnalysisSession(a, { sourceType: 'free', sourceId: null }, { pgn: '1. e4 e4 *', lastPath: '' }),
  ).rejects.toMatchObject({ code: 'ILLEGAL_MOVE', status: 400 });
});

test('the purge removes only free sessions idle for longer than the limit', async () => {
  const a = await createUser();
  const old = new Date(Date.now() - 91 * 86_400_000);
  const free = await createAnalysisSession(a, { sourceType: 'free', sourceId: null }, { pgn: PGN, lastPath: '' });
  const upload = await createAnalysisSession(a, { sourceType: 'upload', sourceId: 'x' }, { pgn: PGN, lastPath: '' });
  const fresh = await createAnalysisSession(a, { sourceType: 'free', sourceId: null }, { pgn: PGN, lastPath: '' });
  await db.update(analysisSessions).set({ updatedAt: old }).where(eq(analysisSessions.id, free.id));
  await db.update(analysisSessions).set({ updatedAt: old }).where(eq(analysisSessions.id, upload.id));
  expect(await purgeFreeAnalysisSessions(90)).toBe(1);
  const left = await db.select({ id: analysisSessions.id }).from(analysisSessions);
  expect(left.map((r) => r.id).sort()).toEqual([upload.id, fresh.id].sort());
});
