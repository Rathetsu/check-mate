// In-process pub/sub for study events (ADR 2026-10-11-04). Pinned on
// globalThis so every route module (and dev hot reloads) share one map.
// ponytail: one web process; move to Postgres LISTEN/NOTIFY if that changes.
import type { TreeOp } from '@checkmate/chess';

export type StudyEvent =
  | { type: 'op'; chapterId: string; version: number; op: TreeOp; by: string; clientId?: string }
  | { type: 'reset'; chapterId: string; version: number; clientId?: string } // refetch the chapter
  | { type: 'meta' } // refetch the study: chapters, names, order, settings, roles
  | { type: 'position'; chapterId: string; path: string; by: string }
  | { type: 'presence'; members: string[]; readers: number };

export type Subscriber = { userId: string | null; send(e: StudyEvent): void; close(): void };

const g = globalThis as unknown as { __checkmateStudySubs?: Map<string, Set<Subscriber>> };
const subs = (g.__checkmateStudySubs ??= new Map());

export function subscribe(studyId: string, sub: Subscriber): () => void {
  let set = subs.get(studyId);
  if (!set) subs.set(studyId, (set = new Set()));
  set.add(sub);
  return () => {
    set.delete(sub);
    if (!set.size) subs.delete(studyId);
  };
}

export function publish(studyId: string, e: StudyEvent): void {
  for (const s of subs.get(studyId) ?? []) s.send(e);
}

// Access changed: every open stream reconnects and is checked again.
export function closeStudy(studyId: string): void {
  for (const s of [...(subs.get(studyId) ?? [])]) s.close();
}

export const subscribers = (studyId: string): Subscriber[] => [...(subs.get(studyId) ?? [])];
