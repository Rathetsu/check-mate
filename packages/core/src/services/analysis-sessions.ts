// Analysis sessions (P1-AN-30..33): one mutable working copy per source.
// Every function is scoped to `userId`; another user's session is a 404.
import { loadGame } from '@checkmate/chess';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db.ts';
import { DomainError } from '../errors.ts';
import { analysisSessions } from '../schema/index.ts';

export const SESSION_SOURCES = ['upload', 'free'] as const;
export type SessionSource = (typeof SESSION_SOURCES)[number];
export const MAX_SESSION_PGN = 1_000_000;

export type SessionInput = { pgn: string; lastPath: string };
export type AnalysisSession = {
  id: string;
  sourceType: string;
  sourceId: string | null;
  pgn: string;
  lastPath: string;
  updatedAt: Date;
};

const columns = {
  id: analysisSessions.id,
  sourceType: analysisSessions.sourceType,
  sourceId: analysisSessions.sourceId,
  pgn: analysisSessions.pgn,
  lastPath: analysisSessions.lastPath,
  updatedAt: analysisSessions.updatedAt,
};
const notFound = () => new DomainError('NOT_FOUND', 404, 'That analysis no longer exists.');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The PGN must load through the rules layer; the resume point is the
// nearest move that exists.
function check({ pgn, lastPath }: SessionInput) {
  if (pgn.length > MAX_SESSION_PGN) throw new DomainError('TOO_LARGE', 413, 'This analysis is too big to save.');
  const r = loadGame(pgn);
  if (!r.ok) throw new DomainError(r.error.code, 400, r.error.message);
  const path = r.cursor.existingPath(lastPath);
  const node = r.cursor.nodeAt(path)!;
  return { pgn, initialFen: r.cursor.root.fen, lastPath: path, lastPositionKey: node.positionKey };
}

export async function createAnalysisSession(
  userId: string,
  source: { sourceType: SessionSource; sourceId: string | null },
  input: SessionInput,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(analysisSessions)
    .values({ userId, ...source, ...check(input) })
    .returning({ id: analysisSessions.id });
  return row!;
}

export async function patchAnalysisSession(userId: string, id: string, input: SessionInput): Promise<void> {
  if (!UUID.test(id)) throw notFound();
  const rows = await db
    .update(analysisSessions)
    .set({ ...check(input), updatedAt: new Date() })
    .where(and(eq(analysisSessions.id, id), eq(analysisSessions.userId, userId)))
    .returning({ id: analysisSessions.id });
  if (!rows.length) throw notFound();
}

export async function getAnalysisSession(userId: string, id: string): Promise<AnalysisSession> {
  if (!UUID.test(id)) throw notFound();
  const [row] = await db
    .select(columns)
    .from(analysisSessions)
    .where(and(eq(analysisSessions.id, id), eq(analysisSessions.userId, userId)));
  if (!row) throw notFound();
  return row;
}

// The user's latest session for a source, to resume it.
export async function findAnalysisSession(
  userId: string,
  sourceType: string,
  sourceId: string | null,
): Promise<AnalysisSession | null> {
  const [row] = await db
    .select(columns)
    .from(analysisSessions)
    .where(
      and(
        eq(analysisSessions.userId, userId),
        eq(analysisSessions.sourceType, sourceType),
        sourceId === null ? sql`${analysisSessions.sourceId} IS NULL` : eq(analysisSessions.sourceId, sourceId),
      ),
    )
    .orderBy(desc(analysisSessions.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function latestAnalysisSession(userId: string): Promise<Pick<AnalysisSession, 'id' | 'updatedAt'> | null> {
  const [row] = await db
    .select({ id: analysisSessions.id, updatedAt: analysisSessions.updatedAt })
    .from(analysisSessions)
    .where(eq(analysisSessions.userId, userId))
    .orderBy(desc(analysisSessions.updatedAt))
    .limit(1);
  return row ?? null;
}

// The worker's daily job (P1-AN-33): the system path, not scoped to a user.
export async function purgeFreeAnalysisSessions(days: number): Promise<number> {
  const rows = await db
    .delete(analysisSessions)
    .where(
      and(
        eq(analysisSessions.sourceType, 'free'),
        lt(analysisSessions.updatedAt, new Date(Date.now() - days * 86_400_000)),
      ),
    )
    .returning({ id: analysisSessions.id });
  return rows.length;
}
