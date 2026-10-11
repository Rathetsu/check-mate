import { deleteChapter, getChapter, patchChapter, replaceChapter } from '@checkmate/core';
import { MAX_PGN_CHARS } from '@checkmate/chess';
import { z } from 'zod';
import { publicRoute, readBody, route } from '@/lib/api';
import { chapterPatch } from '../../../schemas';

type P = { id: string; chapterId: string };

export const GET = publicRoute<P>(async ({ userId, params }) => getChapter(userId, params.id, params.chapterId));

export const PATCH = route<P>(async ({ userId, req, params }) => {
  await patchChapter(userId, params.id, params.chapterId, await readBody(req, chapterPatch));
  return new Response(null, { status: 204 });
});

// Replace the whole chapter: the one write that checks a version (409).
export const PUT = route<P>(async ({ userId, req, params }) => {
  const body = await readBody(req, z.object({ pgn: z.string().min(1).max(MAX_PGN_CHARS), version: z.int() }));
  return replaceChapter(userId, params.id, params.chapterId, body);
});

export const DELETE = route<P>(async ({ userId, params }) => {
  await deleteChapter(userId, params.id, params.chapterId);
  return new Response(null, { status: 204 });
});
