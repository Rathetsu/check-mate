// Studies and chapters (studies spec, ADR 2026-10-11-04). Every function
// goes through `requireStudy`, and every chapter query is scoped by both the
// chapter id and the study id, so a chapter of another study is a 404.
import {
  applyOp,
  ChessError,
  forEachNode,
  indexPgn,
  loadGame,
  makePgn,
  TreeCursor,
  validateSetup,
  type TreeOp,
} from '@checkmate/chess';
import { and, asc, count, desc, eq, inArray, max, sql } from 'drizzle-orm';
import { db } from '../db.ts';
import { DomainError } from '../errors.ts';
import { closeStudy, publish, type StudyEvent } from '../pubsub.ts';
import { studies, studyChapters, studyLikes, studyMembers, user } from '../schema/index.ts';
import { isUuid, requireStudy, type StudyRole, type StudyRow } from './study-access.ts';
import { listMembers, type StudyMember } from './study-members.ts';

export const MAX_CHAPTERS = 64;
export const MAX_CHAPTER_PGN = 500_000;
export const MAX_OWNED_STUDIES = 200;
export const CHAPTER_MODES = ['normal', 'conceal', 'gamebook', 'practice'] as const;
export type ChapterMode = (typeof CHAPTER_MODES)[number];
export type ChapterSource =
  { type: 'blank' } | { type: 'fen'; fen: string } | { type: 'pgn'; pgn: string } | { type: 'lichess'; url: string };
export type ChapterInput = {
  source: ChapterSource;
  name?: string;
  orientation?: 'white' | 'black';
  mode?: ChapterMode;
};

const username = sql<string | null>`coalesce(${user.displayUsername}, ${user.username})`;
const chapterGone = () => new DomainError('NOT_FOUND', 404, 'That chapter no longer exists.');
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// --- trees ---------------------------------------------------------------

function load(pgn: string): TreeCursor {
  const r = loadGame(pgn);
  if (!r.ok) throw new DomainError(r.error.code, 400, r.error.message, { line: r.error.line, ply: r.error.ply });
  return r.cursor;
}

// Pasted PGN can't claim to be written by someone (P1-ST-33).
function stripAuthors(tree: TreeCursor): TreeCursor {
  forEachNode(tree.root, (n) => {
    n.comments = n.comments.map((c) => ({ text: c.text }));
  });
  return tree;
}

// What a chapter row stores for a tree, with the size cap (P1-ST-09).
function stored(tree: TreeCursor) {
  const pgn = makePgn(tree, { extensions: true });
  if (pgn.length > MAX_CHAPTER_PGN)
    throw new DomainError('TOO_LARGE', 413, 'This chapter would be over 500 KB, the limit for one chapter.');
  let end = tree.root;
  while (end.children[0]) end = end.children[0];
  return { pgn, initialFen: tree.root.fen, previewFen: end.fen };
}

function opError(err: unknown): unknown {
  if (!(err instanceof ChessError)) return err;
  const status = { ILLEGAL_MOVE: 400, NODE_GONE: 409, TOO_LARGE: 413, BAD_FEN: 400, BAD_OP: 400 }[err.code];
  return new DomainError(err.code, status, err.message);
}

const gameName = (headers: Map<string, string>, fallback: string) => {
  const part = (k: string) => {
    const v = headers.get(k);
    return v && !/^[?.\s]*$/.test(v) ? v : '';
  };
  const players = part('White') && part('Black') ? `${part('White')} - ${part('Black')}` : '';
  return (players || part('Event') || fallback).slice(0, 100);
};

// --- chapter sources (P1-ST-02) -----------------------------------------

const LICHESS_ID =
  /^(?:https?:\/\/)?(?:www\.)?lichess\.org\/([A-Za-z0-9]{8})(?:[A-Za-z0-9]{4})?(?:\/(?:white|black))?\/?(?:#\d+)?$/;

async function lichessGame(url: string): Promise<string> {
  const id = LICHESS_ID.exec(url.trim())?.[1];
  if (!id) throw new DomainError('BAD_URL', 400, "That isn't a Lichess game link (lichess.org/abcd1234).");
  const base = process.env.LICHESS_URL ?? 'https://lichess.org';
  let res: Response;
  try {
    res = await fetch(`${base}/game/export/${id}?clocks=true&evals=true`, {
      headers: { accept: 'application/x-chess-pgn' },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new DomainError('UPSTREAM', 502, "Lichess didn't answer. Try again in a moment.");
  }
  if (res.status === 429)
    throw new DomainError('RATE_LIMITED', 429, 'Lichess is busy right now. Try again in a minute.');
  if (res.status === 404) throw new DomainError('NOT_FOUND', 404, 'Lichess has no game at that link.');
  if (!res.ok) throw new DomainError('UPSTREAM', 502, "Lichess didn't send the game. Try again in a moment.");
  return res.text();
}

async function treesFor(source: ChapterSource): Promise<{ tree: TreeCursor; name?: string; sourceId?: string }[]> {
  switch (source.type) {
    case 'blank':
      return [{ tree: TreeCursor.fromFen() }];
    case 'fen': {
      const r = validateSetup(source.fen);
      if (!r.ok) throw new DomainError('BAD_FEN', 400, r.reasons.map((x) => x.message).join(' '));
      return [{ tree: TreeCursor.fromFen(r.fen) }];
    }
    case 'pgn': {
      const { games, error } = indexPgn(source.pgn);
      if (error) throw new DomainError(error.code, 400, error.message);
      const bad = games.find((g) => g.error);
      if (bad?.error)
        throw new DomainError(
          bad.error.code,
          400,
          `Game ${bad.index + 1}, line ${bad.error.line}: ${bad.error.message}`,
          {
            gameIndex: bad.index,
            line: bad.error.line,
            ply: bad.error.ply,
          },
        );
      if (games.length > MAX_CHAPTERS)
        throw new DomainError('TOO_MANY_CHAPTERS', 400, `A study holds up to ${MAX_CHAPTERS} chapters.`);
      return games.map((g) => {
        const r = loadGame(source.pgn, g.index);
        if (!r.ok) throw new DomainError(r.error.code, 400, r.error.message);
        return { tree: stripAuthors(r.cursor), name: gameName(r.cursor.headers, `Chapter`) };
      });
    }
    case 'lichess': {
      const tree = stripAuthors(load(await lichessGame(source.url)));
      return [{ tree, name: gameName(tree.headers, 'Lichess game'), sourceId: tree.headers.get('Site') }];
    }
  }
}

// --- studies ---------------------------------------------------------------

export type StudySummary = {
  id: string;
  name: string;
  owner: string | null;
  visibility: string;
  topics: string[];
  chapters: number;
  likes: number;
  previewFen: string | null;
  createdAt: Date;
  updatedAt: Date;
};
export const STUDY_TABS = ['mine', 'member', 'invites', 'liked', 'public'] as const;
export const STUDY_SORTS = ['hot', 'newest', 'updated', 'liked', 'name'] as const;
export type StudyListOpts = {
  tab?: (typeof STUDY_TABS)[number];
  q?: string;
  topic?: string;
  sort?: (typeof STUDY_SORTS)[number];
  page?: number;
};
export const STUDIES_PER_PAGE = 24;

const likeCount = sql<number>`(SELECT count(*)::int FROM ${studyLikes} l WHERE l.study_id = ${studies.id})`;
// lila Study.Rank.compute at commit 46d24871 (AGPL-3.0-or-later): the creation
// time pushed forward by min(int(5·ln(likes) + 1), likes) days.
const hotRank = sql`${studies.createdAt} + make_interval(hours => CASE WHEN ${likeCount} < 1 THEN 0
  ELSE LEAST(floor(5 * ln(${likeCount}) + 1)::int, ${likeCount}) * 24 END)`;
const ORDER = {
  hot: desc(hotRank),
  newest: desc(studies.createdAt),
  updated: desc(studies.updatedAt),
  liked: desc(likeCount),
  name: asc(sql`lower(${studies.name})`),
};

// P1-ST-10, P1-ST-22. Every tab but `public` needs a user. `member` lists
// accepted memberships, `invites` pending ones (the name only: an invite
// gives no access). A liked study shows only while its reader can read it.
export async function listStudies(userId: string | null, opts: StudyListOpts = {}): Promise<StudySummary[]> {
  const tab = opts.tab ?? 'mine';
  if (!userId && tab !== 'public') return [];
  const q = opts.q?.trim();
  const membership = (status: string) =>
    sql`EXISTS (SELECT 1 FROM ${studyMembers} m WHERE m.study_id = ${studies.id} AND m.user_id = ${userId} AND m.status = ${status})`;
  const where = and(
    tab === 'mine'
      ? eq(studies.userId, userId!)
      : tab === 'member'
        ? membership('active')
        : tab === 'invites'
          ? membership('invited')
          : tab === 'liked'
            ? and(
                sql`EXISTS (SELECT 1 FROM ${studyLikes} l WHERE l.study_id = ${studies.id} AND l.user_id = ${userId})`,
                sql`(${studies.visibility} <> 'private' OR ${studies.userId} = ${userId} OR ${membership('active')})`,
              )
            : eq(studies.visibility, 'public'),
    q ? sql`${studies.name} ILIKE ${`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`}` : undefined,
    opts.topic ? sql`${studies.topics} @> ARRAY[${opts.topic}]::text[]` : undefined,
  );
  return db
    .select({
      id: studies.id,
      name: studies.name,
      owner: username,
      visibility: studies.visibility,
      topics: studies.topics,
      createdAt: studies.createdAt,
      updatedAt: studies.updatedAt,
      likes: likeCount,
      chapters: sql<number>`(SELECT count(*)::int FROM ${studyChapters} c WHERE c.study_id = ${studies.id})`,
      previewFen: sql<
        string | null
      >`(SELECT c.preview_fen FROM ${studyChapters} c WHERE c.study_id = ${studies.id} ORDER BY c.ord, c.created_at LIMIT 1)`,
    })
    .from(studies)
    .leftJoin(user, eq(user.id, studies.userId))
    .where(where)
    .orderBy(ORDER[opts.sort ?? (tab === 'mine' ? 'updated' : 'hot')], desc(studies.createdAt))
    .limit(STUDIES_PER_PAGE)
    .offset(Math.max(0, opts.page ?? 0) * STUDIES_PER_PAGE);
}

// P1-ST-21: anyone who can read a study can like it.
export async function likeStudy(userId: string, studyId: string, liked: boolean) {
  await requireStudy(userId, studyId, 'read');
  if (liked) await db.insert(studyLikes).values({ studyId, userId }).onConflictDoNothing();
  else await db.delete(studyLikes).where(and(eq(studyLikes.studyId, studyId), eq(studyLikes.userId, userId)));
  return likes(userId, studyId);
}

async function likes(userId: string | null, studyId: string) {
  const [row] = await db
    .select({
      likes: count(),
      liked: sql<boolean>`coalesce(bool_or(${studyLikes.userId} = ${userId}), false)`,
    })
    .from(studyLikes)
    .where(eq(studyLikes.studyId, studyId));
  return { likes: row?.likes ?? 0, liked: row?.liked ?? false };
}

// P1-ST-20: a private copy with every chapter, when the study allows it.
export async function cloneStudy(userId: string, studyId: string): Promise<{ id: string }> {
  const { role, study } = await requireStudy(userId, studyId, 'read');
  if (role !== 'owner' && !allows(study.settings.cloneable, role))
    throw new DomainError('FORBIDDEN', 403, "This study's owner doesn't allow copying it.");
  const rows = await db
    .select()
    .from(studyChapters)
    .where(eq(studyChapters.studyId, studyId))
    .orderBy(asc(studyChapters.ord), asc(studyChapters.createdAt));
  return db.transaction(async (tx) => {
    const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(studies).where(eq(studies.userId, userId));
    if (n >= MAX_OWNED_STUDIES)
      throw new DomainError(
        'TOO_MANY_STUDIES',
        400,
        `You can own up to ${MAX_OWNED_STUDIES} studies. Delete one first.`,
      );
    const [copy] = await tx
      .insert(studies)
      .values({
        userId,
        name: study.name,
        description: study.description,
        settings: study.settings,
        topics: study.topics,
      })
      .returning({ id: studies.id });
    await tx.insert(studyChapters).values(
      rows.map(({ id, studyId: _, createdAt: __, updatedAt: ___, version: ____, ...c }, ord) => ({
        ...c,
        ord,
        studyId: copy!.id,
        sourceType: 'copy',
        sourceId: id,
      })),
    );
    return { id: copy!.id };
  });
}

// A new study starts with one chapter: blank, or the given source's first
// game ("Save to study" from analysis or the editor, P1-ST-19).
export async function createStudy(
  userId: string,
  name: string,
  first?: ChapterInput,
): Promise<{ id: string; chapterId: string }> {
  const [tree] = first ? await treesFor(first.source) : [{ tree: TreeCursor.fromFen(), name: undefined }];
  return db.transaction(async (tx) => {
    const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(studies).where(eq(studies.userId, userId));
    if (n >= MAX_OWNED_STUDIES)
      throw new DomainError(
        'TOO_MANY_STUDIES',
        400,
        `You can own up to ${MAX_OWNED_STUDIES} studies. Delete one first.`,
      );
    const [study] = await tx.insert(studies).values({ userId, name }).returning({ id: studies.id });
    const [chapter] = await tx
      .insert(studyChapters)
      .values({
        studyId: study!.id,
        ord: 0,
        name: first?.name?.trim() || tree?.name || 'Chapter 1',
        orientation: first?.orientation ?? 'white',
        mode: first?.mode ?? 'normal',
        sourceType: first?.source.type ?? 'blank',
        ...stored(tree!.tree),
      })
      .returning({ id: studyChapters.id });
    return { id: study!.id, chapterId: chapter!.id };
  });
}

export type ChapterSummary = {
  id: string;
  name: string;
  ord: number;
  orientation: string;
  mode: string;
  previewFen: string;
  version: number;
};
export type StudyDetail = Pick<
  StudyRow,
  'id' | 'name' | 'description' | 'visibility' | 'settings' | 'topics' | 'position' | 'createdAt' | 'updatedAt'
> & {
  ownerId: string;
  owner: string | null;
  role: StudyRole;
  chapters: ChapterSummary[];
  likes: number;
  liked: boolean;
  members: StudyMember[]; // active ones, plus pending invites for the owner
};

export async function getStudy(userId: string | null, studyId: string): Promise<StudyDetail> {
  const { role, study } = await requireStudy(userId, studyId, 'read');
  const [owner] = await db.select({ name: username }).from(user).where(eq(user.id, study.userId));
  const chapters = await db
    .select({
      id: studyChapters.id,
      name: studyChapters.name,
      ord: studyChapters.ord,
      orientation: studyChapters.orientation,
      mode: studyChapters.mode,
      previewFen: studyChapters.previewFen,
      version: studyChapters.version,
    })
    .from(studyChapters)
    .where(eq(studyChapters.studyId, studyId))
    .orderBy(asc(studyChapters.ord), asc(studyChapters.createdAt));
  const { userId: _, ...rest } = study;
  return {
    ...rest,
    ownerId: study.userId,
    owner: owner?.name ?? null,
    role,
    chapters,
    ...(await likes(userId, studyId)),
    members: await listMembers(studyId, role === 'owner'),
  };
}

export type StudyPatch = Partial<Pick<StudyRow, 'name' | 'description' | 'visibility' | 'settings' | 'topics'>>;

export async function updateStudy(userId: string, studyId: string, patch: StudyPatch): Promise<void> {
  await requireStudy(userId, studyId, 'own');
  await db
    .update(studies)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(studies.id, studyId));
  publish(studyId, { type: 'meta' });
  // Who may read may have changed: open streams reconnect and check again.
  if (patch.visibility || patch.settings) closeStudy(studyId);
}

export async function deleteStudy(userId: string, studyId: string): Promise<void> {
  await requireStudy(userId, studyId, 'own');
  await db.delete(studies).where(eq(studies.id, studyId));
  publish(studyId, { type: 'meta' });
}

// P1-ST-13: the remembered position, and the sync target in 4.3.
export async function setStudyPosition(
  userId: string,
  studyId: string,
  position: { chapterId: string; path: string },
): Promise<void> {
  await requireStudy(userId, studyId, 'edit');
  await chapterRow(db, studyId, position.chapterId);
  await db.update(studies).set({ position }).where(eq(studies.id, studyId));
  publish(studyId, { type: 'position', ...position, by: userId });
}

// --- chapters --------------------------------------------------------------

async function chapterRow(tx: Pick<typeof db, 'select'>, studyId: string, chapterId: string, lock = false) {
  if (!isUuid(chapterId)) throw chapterGone();
  const q = tx
    .select()
    .from(studyChapters)
    .where(and(eq(studyChapters.id, chapterId), eq(studyChapters.studyId, studyId)));
  const [row] = lock ? await q.for('update') : await q;
  if (!row) throw chapterGone();
  return row;
}

const touch = (tx: Tx, studyId: string) =>
  tx.update(studies).set({ updatedAt: new Date() }).where(eq(studies.id, studyId));

export async function createChapters(userId: string, studyId: string, input: ChapterInput): Promise<{ ids: string[] }> {
  await requireStudy(userId, studyId, 'edit');
  const trees = await treesFor(input.source);
  const ids = await db.transaction(async (tx) => {
    const [{ n, last } = { n: 0, last: -1 }] = await tx
      .select({ n: count(), last: max(studyChapters.ord) })
      .from(studyChapters)
      .where(eq(studyChapters.studyId, studyId));
    if (n + trees.length > MAX_CHAPTERS)
      throw new DomainError(
        'TOO_MANY_CHAPTERS',
        400,
        `A study holds up to ${MAX_CHAPTERS} chapters. This one has ${n}, so ${trees.length} more won't fit.`,
      );
    const rows = trees.map((t, i) => ({
      studyId,
      ord: (last ?? -1) + 1 + i,
      name: (trees.length === 1 && input.name?.trim()) || t.name || `Chapter ${n + i + 1}`,
      orientation: input.orientation ?? 'white',
      mode: input.mode ?? 'normal',
      sourceType: input.source.type,
      sourceId: t.sourceId ?? null,
      ...stored(t.tree),
    }));
    const inserted = await tx.insert(studyChapters).values(rows).returning({ id: studyChapters.id });
    await touch(tx, studyId);
    return inserted.map((r) => r.id);
  });
  publish(studyId, { type: 'meta' });
  return { ids };
}

export type ChapterDetail = {
  id: string;
  name: string;
  orientation: string;
  description: string;
  mode: string;
  pgn: string;
  version: number;
  authors: Record<string, string | null>; // comment author ids → usernames; null = deleted account
};

export async function getChapter(userId: string | null, studyId: string, chapterId: string): Promise<ChapterDetail> {
  await requireStudy(userId, studyId, 'read');
  const row = await chapterRow(db, studyId, chapterId);
  return {
    id: row.id,
    name: row.name,
    orientation: row.orientation,
    description: row.description,
    mode: row.mode,
    pgn: row.pgn,
    version: row.version,
    authors: await authorNames(load(row.pgn)),
  };
}

async function authorNames(tree: TreeCursor): Promise<Record<string, string | null>> {
  const ids = new Set<string>();
  forEachNode(tree.root, (n) => n.comments.forEach((c) => c.by && ids.add(c.by)));
  if (!ids.size) return {};
  const rows = await db
    .select({ id: user.id, name: username })
    .from(user)
    .where(inArray(user.id, [...ids]));
  const names: Record<string, string | null> = Object.fromEntries([...ids].map((id) => [id, null]));
  for (const r of rows) names[r.id] = r.name;
  return names;
}

export async function patchChapter(
  userId: string,
  studyId: string,
  chapterId: string,
  patch: Partial<{ name: string; orientation: 'white' | 'black'; description: string; mode: ChapterMode }>,
): Promise<void> {
  await requireStudy(userId, studyId, 'edit');
  await chapterRow(db, studyId, chapterId);
  await db
    .update(studyChapters)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(studyChapters.id, chapterId), eq(studyChapters.studyId, studyId)));
  publish(studyId, { type: 'meta' });
}

export async function deleteChapter(userId: string, studyId: string, chapterId: string): Promise<void> {
  await requireStudy(userId, studyId, 'edit');
  await db.transaction(async (tx) => {
    await chapterRow(tx, studyId, chapterId, true);
    const [{ n } = { n: 0 }] = await tx
      .select({ n: count() })
      .from(studyChapters)
      .where(eq(studyChapters.studyId, studyId));
    if (n <= 1) throw new DomainError('LAST_CHAPTER', 400, 'A study needs at least one chapter.');
    await tx.delete(studyChapters).where(and(eq(studyChapters.id, chapterId), eq(studyChapters.studyId, studyId)));
    await touch(tx, studyId);
  });
  publish(studyId, { type: 'meta' });
}

export async function reorderChapters(userId: string, studyId: string, chapterIds: string[]): Promise<void> {
  await requireStudy(userId, studyId, 'edit');
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: studyChapters.id })
      .from(studyChapters)
      .where(eq(studyChapters.studyId, studyId));
    const have = new Set(rows.map((r) => r.id));
    if (chapterIds.length !== have.size || !chapterIds.every((id) => have.has(id)))
      throw new DomainError('VALIDATION', 400, 'The new order must list every chapter once.');
    for (const [ord, id] of chapterIds.entries())
      await tx
        .update(studyChapters)
        .set({ ord })
        .where(and(eq(studyChapters.id, id), eq(studyChapters.studyId, studyId)));
    await touch(tx, studyId);
  });
  publish(studyId, { type: 'meta' });
}

// Ops on one chapter wait their turn, so a busy chapter holds one database
// connection at a time and versions are published in order.
// ponytail: in-process queue; one web process (see pubsub.ts).
const queues = new Map<string, Promise<unknown>>();
function inTurn<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(fn);
  queues.set(key, run);
  void run.finally(() => queues.get(key) === run && queues.delete(key)).catch(() => {});
  return run;
}

// Ops that rewrite much of the tree: members refetch instead of replaying.
const RESETS = new Set<TreeOp['op']>(['setTags', 'clearAnnotations', 'clearVariations']);

export async function applyChapterOp(
  userId: string,
  studyId: string,
  chapterId: string,
  op: TreeOp,
  clientId?: string,
): Promise<{ version: number }> {
  const version = await inTurn(chapterId, () =>
    db.transaction(async (tx) => {
      await requireStudy(userId, studyId, 'edit', tx);
      const row = await chapterRow(tx, studyId, chapterId, true);
      const tree = load(row.pgn);
      try {
        applyOp(tree, op, userId); // the server stamps the comment author
      } catch (err) {
        throw opError(err);
      }
      const next = row.version + 1;
      await tx
        .update(studyChapters)
        .set({ ...stored(tree), version: next, updatedAt: new Date() })
        .where(eq(studyChapters.id, chapterId));
      await touch(tx, studyId);
      return next;
    }),
  );
  const e: StudyEvent = RESETS.has(op.op)
    ? { type: 'reset', chapterId, version, clientId }
    : { type: 'op', chapterId, version, op, by: userId, clientId };
  publish(studyId, e);
  return { version };
}

// "Replace chapter": the one write that checks a version (P1-ST-05).
export async function replaceChapter(
  userId: string,
  studyId: string,
  chapterId: string,
  input: { pgn: string; version: number },
): Promise<{ version: number }> {
  await requireStudy(userId, studyId, 'edit');
  const tree = stripAuthors(load(input.pgn));
  const version = await inTurn(chapterId, () =>
    db.transaction(async (tx) => {
      const row = await chapterRow(tx, studyId, chapterId, true);
      if (row.version !== input.version)
        throw new DomainError('VERSION_CONFLICT', 409, 'Someone changed this chapter since you opened it.', {
          version: row.version,
        });
      await tx
        .update(studyChapters)
        .set({ ...stored(tree), version: row.version + 1, updatedAt: new Date() })
        .where(eq(studyChapters.id, chapterId));
      await touch(tx, studyId);
      return row.version + 1;
    }),
  );
  publish(studyId, { type: 'reset', chapterId, version });
  return { version };
}

// P1-ST-12: copy into another study the user can edit, within its cap.
export async function copyChapter(
  userId: string,
  studyId: string,
  chapterId: string,
  toStudyId: string,
): Promise<{ id: string }> {
  const { role, study } = await requireStudy(userId, studyId, 'read');
  if (role !== 'owner' && !allows(study.settings.cloneable, role))
    throw new DomainError('FORBIDDEN', 403, "This study's owner doesn't allow copying.");
  const row = await chapterRow(db, studyId, chapterId);
  const { ids } = await copyInto(userId, toStudyId, row);
  return { id: ids[0]! };
}

async function copyInto(userId: string, toStudyId: string, row: typeof studyChapters.$inferSelect) {
  await requireStudy(userId, toStudyId, 'edit');
  const id = await db.transaction(async (tx) => {
    const [{ n, last } = { n: 0, last: -1 }] = await tx
      .select({ n: count(), last: max(studyChapters.ord) })
      .from(studyChapters)
      .where(eq(studyChapters.studyId, toStudyId));
    if (n >= MAX_CHAPTERS)
      throw new DomainError('TOO_MANY_CHAPTERS', 400, `That study already has ${MAX_CHAPTERS} chapters.`);
    const [inserted] = await tx
      .insert(studyChapters)
      .values({
        studyId: toStudyId,
        ord: (last ?? -1) + 1,
        name: row.name,
        orientation: row.orientation,
        description: row.description,
        mode: row.mode,
        pgn: row.pgn,
        initialFen: row.initialFen,
        previewFen: row.previewFen,
        sourceType: 'copy',
        sourceId: row.id,
      })
      .returning({ id: studyChapters.id });
    await touch(tx, toStudyId);
    return inserted!.id;
  });
  publish(toStudyId, { type: 'meta' });
  return { ids: [id] };
}

// `everyone` | `contributors` | `nobody`, for a non-owner.
export const allows = (rule: string, role: StudyRole) =>
  rule === 'everyone' || (rule === 'contributors' && role === 'contributor');

// --- export (P1-ST-08) -------------------------------------------------------

export async function exportStudyPgn(
  userId: string | null,
  studyId: string,
  opts: { chapterId?: string; extensions?: boolean } = {},
): Promise<{ filename: string; pgn: string }> {
  const { role, study } = await requireStudy(userId, studyId, 'read');
  if (role !== 'owner' && !allows(study.settings.shareable, role))
    throw new DomainError('FORBIDDEN', 403, "This study's owner doesn't allow exporting it.");
  const rows = opts.chapterId
    ? [await chapterRow(db, studyId, opts.chapterId)]
    : await db
        .select()
        .from(studyChapters)
        .where(eq(studyChapters.studyId, studyId))
        .orderBy(asc(studyChapters.ord), asc(studyChapters.createdAt));
  const games: string[] = [];
  for (const row of rows) {
    const tree = load(row.pgn);
    const headers = new Map([
      ['Event', `${study.name}: ${row.name}`],
      ...[...tree.headers].filter(([k]) => !['Event', 'StudyName', 'ChapterName'].includes(k)),
      ['StudyName', study.name],
      ['ChapterName', row.name],
    ]);
    tree.headers = headers;
    if (opts.extensions) {
      // Authors leave as usernames, or "Deleted user" (P1-ST-33).
      const names = await authorNames(tree);
      forEachNode(tree.root, (n) => {
        n.comments = n.comments.map((c) => (c.by ? { text: c.text, by: names[c.by] ?? 'Deleted user' } : c));
      });
    }
    games.push(makePgn(tree, { extensions: !!opts.extensions }));
  }
  const base = (opts.chapterId ? `${study.name}-${rows[0]!.name}` : study.name).replace(/[^\p{L}\p{N}._-]+/gu, '_');
  return { filename: `${base || 'study'}.pgn`, pgn: games.join('\n') };
}

// The first event of a study stream (P1-ST-31): access is checked, and every
// chapter's version lets the client catch up after a gap or a reconnect.
export async function studyHello(userId: string | null, studyId: string) {
  const { role, study } = await requireStudy(userId, studyId, 'read');
  const rows = await db
    .select({ id: studyChapters.id, version: studyChapters.version })
    .from(studyChapters)
    .where(eq(studyChapters.studyId, studyId));
  return {
    role,
    position: study.position,
    versions: Object.fromEntries(rows.map((r) => [r.id, r.version])) as Record<string, number>,
  };
}
