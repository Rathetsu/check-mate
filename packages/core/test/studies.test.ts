// Studies 4.1 (studies spec acceptance criteria): CRUD, chapter sources,
// ops, limits, scoping, export.
import { createServer, type Server } from 'node:http';
import { TreeCursor } from '@checkmate/chess';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { db } from '../src/db.ts';
import { studies, user } from '../src/schema/index.ts';
import {
  applyChapterOp,
  copyChapter,
  createChapters,
  createStudy,
  deleteChapter,
  exportStudyPgn,
  getChapter,
  getStudy,
  listStudies,
  MAX_CHAPTERS,
  replaceChapter,
  reorderChapters,
  updateStudy,
} from '../src/services/studies.ts';
import { createUser, resetDb } from './helpers.ts';

beforeEach(resetDb);

const E4 = TreeCursor.fromFen().addNode('', 'e2e4'); // its node id, which is also its path

const TWO_GAMES = `[Event "One"]\n[White "Anna"]\n[Black "Ben"]\n\n1. e4 e5 *\n\n[Event "Two"]\n\n1. d4 d5 *\n`;

async function studyOf(owner: string) {
  const { id, chapterId } = await createStudy(owner, 'Openings');
  return { id, chapterId };
}

test('a new study has a blank chapter; it is listed and private by default (P1-ST-01, P1-ST-11)', async () => {
  const a = await createUser('A');
  const b = await createUser('B');
  const s = await studyOf(a);
  const study = await getStudy(a, s.id);
  expect(study.role).toBe('owner');
  expect(study.visibility).toBe('private');
  expect(study.chapters).toHaveLength(1);
  expect((await listStudies(a)).map((x) => x.name)).toEqual(['Openings']);
  await expect(getStudy(b, s.id)).rejects.toMatchObject({ status: 404 });
  await expect(getStudy(null, s.id)).rejects.toMatchObject({ status: 404 });
  await expect(getStudy(a, 'not-a-uuid')).rejects.toMatchObject({ status: 404 });
});

test('public and unlisted studies can be read by anyone but not edited (P1-ST-23)', async () => {
  const a = await createUser('A');
  const b = await createUser('B');
  const s = await studyOf(a);
  await updateStudy(a, s.id, { visibility: 'unlisted' });
  expect((await getStudy(null, s.id)).role).toBe('reader');
  expect((await getChapter(b, s.id, s.chapterId)).pgn).toContain('*');
  await expect(applyChapterOp(b, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e4' })).rejects.toMatchObject({
    status: 403,
  });
  await expect(updateStudy(b, s.id, { name: 'Mine now' })).rejects.toMatchObject({ status: 403 });
});

test('chapters from a FEN and a two-game PGN, named from the headers (P1-ST-02)', async () => {
  const a = await createUser();
  const s = await studyOf(a);
  await createChapters(a, s.id, {
    source: { type: 'fen', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1' },
    name: 'Pawn ending',
  });
  const { ids } = await createChapters(a, s.id, { source: { type: 'pgn', pgn: TWO_GAMES } });
  expect(ids).toHaveLength(2);
  const names = (await getStudy(a, s.id)).chapters.map((c) => c.name);
  expect(names).toEqual(['Chapter 1', 'Pawn ending', 'Anna - Ben', 'Two']);
  await expect(createChapters(a, s.id, { source: { type: 'pgn', pgn: '1. e4 e4 *' } })).rejects.toMatchObject({
    status: 400,
    code: 'ILLEGAL_MOVE',
  });
  await expect(
    createChapters(a, s.id, { source: { type: 'fen', fen: '8/8/8/8/8/8/8/8 w - - 0 1' } }),
  ).rejects.toMatchObject({ status: 400, code: 'BAD_FEN' });
});

test('the 65th chapter is refused (P1-ST-09)', async () => {
  const a = await createUser();
  const s = await studyOf(a);
  const pgn = Array.from({ length: MAX_CHAPTERS - 1 }, () => '1. e4 *').join('\n\n');
  await createChapters(a, s.id, { source: { type: 'pgn', pgn } });
  await expect(createChapters(a, s.id, { source: { type: 'blank' } })).rejects.toMatchObject({
    code: 'TOO_MANY_CHAPTERS',
    message: expect.stringContaining('64'),
  });
  // Copying into the full study is refused too.
  const other = await studyOf(a);
  await expect(copyChapter(a, other.id, other.chapterId, s.id)).rejects.toMatchObject({ code: 'TOO_MANY_CHAPTERS' });
});

describe('ops (P1-ST-04, ADR 2026-10-11-04)', () => {
  test('an op is applied, stored with its author, and bumps the version', async () => {
    const a = await createUser('A');
    const s = await studyOf(a);
    const r1 = await applyChapterOp(a, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e4' });
    const e4 = (await getChapter(a, s.id, s.chapterId)).pgn.includes('1. e4');
    expect(e4).toBe(true);
    const ch = await getChapter(a, s.id, s.chapterId);
    const r2 = await applyChapterOp(a, s.id, s.chapterId, { op: 'setComment', path: E4, text: 'Best by test' });
    expect([r1.version, r2.version]).toEqual([ch.version, ch.version + 1]);
    const after = await getChapter(a, s.id, s.chapterId);
    expect(after.pgn).toContain(`[%cm-by ${a}] Best by test`);
    const [{ name } = { name: null }] = await db
      .select({ name: user.displayUsername })
      .from(user)
      .where(eq(user.id, a));
    expect(after.authors).toEqual({ [a]: name });
  });

  test('an illegal move is a 400 ILLEGAL_MOVE; a missing path is 409 NODE_GONE', async () => {
    const a = await createUser();
    const s = await studyOf(a);
    await expect(applyChapterOp(a, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e5' })).rejects.toMatchObject({
      status: 400,
      code: 'ILLEGAL_MOVE',
    });
    await expect(applyChapterOp(a, s.id, s.chapterId, { op: 'setNags', path: 'zz', nags: [1] })).rejects.toMatchObject({
      status: 409,
      code: 'NODE_GONE',
    });
    await expect(
      applyChapterOp(a, s.id, s.chapterId, { op: 'setTags', tags: [['FEN', '4k3/8/8/8/8/8/8/4K3 w - - 0 1']] }),
    ).rejects.toMatchObject({ status: 400, code: 'BAD_OP' });
  });

  test("a chapter id from another study is a 404, even for that study's owner", async () => {
    const a = await createUser();
    const x = await studyOf(a);
    const y = await studyOf(a);
    await expect(applyChapterOp(a, x.id, y.chapterId, { op: 'addNode', path: '', uci: 'e2e4' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(getChapter(a, x.id, y.chapterId)).rejects.toMatchObject({ status: 404 });
  });

  test('concurrent ops serialize: no lost update, versions in order', async () => {
    const a = await createUser();
    const s = await studyOf(a);
    const before = (await getChapter(a, s.id, s.chapterId)).version;
    const results = await Promise.all(
      ['e2e4', 'd2d4', 'c2c4', 'g1f3'].map((uci) =>
        applyChapterOp(a, s.id, s.chapterId, { op: 'addNode', path: '', uci }),
      ),
    );
    expect(results.map((r) => r.version).sort()).toEqual([1, 2, 3, 4].map((n) => before + n));
    const pgn = (await getChapter(a, s.id, s.chapterId)).pgn;
    for (const san of ['e4', 'd4', 'c4', 'Nf3']) expect(pgn).toContain(san);
  });

  test('replace chapter checks the version (P1-ST-05)', async () => {
    const a = await createUser();
    const s = await studyOf(a);
    const { version } = await getChapter(a, s.id, s.chapterId);
    expect(await replaceChapter(a, s.id, s.chapterId, { pgn: '1. c4 *', version })).toEqual({ version: version + 1 });
    await expect(replaceChapter(a, s.id, s.chapterId, { pgn: '1. d4 *', version })).rejects.toMatchObject({
      status: 409,
    });
  });

  test('per-op cost on a ~500 KB chapter stays reasonable', async () => {
    const a = await createUser();
    const s = await studyOf(a);
    const moves = Array.from({ length: 12_000 }, (_, i) => ['Nf3', 'Nf6', 'Ng1', 'Ng8'][i % 4]!);
    const pgn = `${moves.map((m, i) => (i % 2 ? `${m} { a comment long enough to fill the chapter up to a big one }` : m)).join(' ')} *`;
    const { ids } = await createChapters(a, s.id, { source: { type: 'pgn', pgn } });
    const t0 = performance.now();
    await applyChapterOp(a, s.id, ids[0]!, { op: 'addNode', path: '', uci: 'e2e4' });
    await applyChapterOp(a, s.id, ids[0]!, { op: 'setNags', path: E4, nags: [1] });
    const ms = (performance.now() - t0) / 2;
    console.info(`[bench] one op on a ${Math.round(pgn.length / 1024)} KB chapter: ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(2_000);
  });
});

test('imported PGN cannot claim an author (P1-ST-33)', async () => {
  const a = await createUser();
  const s = await studyOf(a);
  const forged = `1. e4 { [%cm-by ${a}] I wrote this } *`;
  const { ids } = await createChapters(a, s.id, { source: { type: 'pgn', pgn: forged } });
  const ch = await getChapter(a, s.id, ids[0]!);
  expect(ch.pgn).not.toContain('cm-by');
  expect(ch.pgn).toContain('I wrote this');
});

test('export: CheckMate data only on request, authors by name or "Deleted user" (P1-ST-08)', async () => {
  const a = await createUser('A');
  const b = await createUser('B');
  const s = await studyOf(a);
  await applyChapterOp(a, s.id, s.chapterId, { op: 'addNode', path: '', uci: 'e2e4' });
  await applyChapterOp(a, s.id, s.chapterId, { op: 'setComment', path: E4, text: 'Mine' });
  await applyChapterOp(a, s.id, s.chapterId, { op: 'setGamebook', path: E4, hint: 'Center!', deviation: '' });
  const plain = await exportStudyPgn(a, s.id);
  expect(plain.pgn).toContain('[Event "Openings: Chapter 1"]');
  expect(plain.pgn).toContain('[StudyName "Openings"]');
  expect(plain.pgn).toContain('[ChapterName "Chapter 1"]');
  expect(plain.pgn).not.toContain('%cm-');
  expect(plain.filename).toBe('Openings.pgn');
  const ext = await exportStudyPgn(a, s.id, { extensions: true });
  expect(ext.pgn).toContain('[%cm-hint Center!]');
  expect(ext.pgn).not.toContain(a); // the account id never leaves
  // A deleted author shows as "Deleted user" (their comment lives in someone else's study).
  await updateStudy(a, s.id, { visibility: 'public' });
  await db.update(studies).set({ userId: b }).where(eq(studies.id, s.id));
  await db.delete(user).where(eq(user.id, a));
  const orphan = await exportStudyPgn(b, s.id, { extensions: true });
  expect(orphan.pgn).toContain('[%cm-by Deleted user] Mine');
  expect((await getChapter(b, s.id, s.chapterId)).authors).toEqual({ [a]: null });
});

test('reorder needs every chapter once; the last chapter cannot be deleted', async () => {
  const a = await createUser();
  const s = await studyOf(a);
  const { ids } = await createChapters(a, s.id, { source: { type: 'blank' } });
  await reorderChapters(a, s.id, [ids[0]!, s.chapterId]);
  expect((await getStudy(a, s.id)).chapters.map((c) => c.id)).toEqual([ids[0], s.chapterId]);
  await expect(reorderChapters(a, s.id, [ids[0]!])).rejects.toMatchObject({ status: 400 });
  await deleteChapter(a, s.id, ids[0]!);
  await expect(deleteChapter(a, s.id, s.chapterId)).rejects.toMatchObject({ code: 'LAST_CHAPTER' });
});

describe('chapter from a Lichess game URL (P1-ST-02)', () => {
  let server: Server;
  let status = 200;
  beforeAll(async () => {
    server = createServer((req, res) => {
      res.statusCode = status;
      res.end(
        req.url?.startsWith('/game/export/abcd1234')
          ? '[Event "Rated blitz game"]\n[Site "https://lichess.org/abcd1234"]\n[White "x"]\n[Black "y"]\n\n1. e4 { [%cm-by someone] [%clk 0:03:00] } c5 *'
          : '',
      );
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    process.env.LICHESS_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => {
    server.close();
    delete process.env.LICHESS_URL;
  });

  test('fetches the game once and keeps its source', async () => {
    status = 200;
    const a = await createUser();
    const s = await studyOf(a);
    const { ids } = await createChapters(a, s.id, {
      source: { type: 'lichess', url: 'https://lichess.org/abcd1234/black' },
    });
    const ch = await getChapter(a, s.id, ids[0]!);
    expect(ch.name).toBe('x - y');
    expect(ch.pgn).toContain('1. e4');
    expect(ch.pgn).not.toContain('cm-by');
  });

  test('a bad link, a busy Lichess and a missing game are plain errors', async () => {
    const a = await createUser();
    const s = await studyOf(a);
    const add = (url: string) => createChapters(a, s.id, { source: { type: 'lichess', url } });
    await expect(add('https://example.com/abcd1234')).rejects.toMatchObject({ code: 'BAD_URL' });
    status = 429;
    await expect(add('lichess.org/abcd1234')).rejects.toMatchObject({ status: 429 });
    status = 404;
    await expect(add('lichess.org/abcd1234')).rejects.toMatchObject({ status: 404 });
  });
});
