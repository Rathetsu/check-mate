import { createAnalysisSession, DomainError, findAnalysisSession, SESSION_SOURCES } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';
import { sessionBody } from './schema';

// P1-AN-30: one working copy per source.
export const POST = route(async ({ userId, req }) => {
  const body = await readBody(
    req,
    sessionBody.extend({ sourceType: z.enum(SESSION_SOURCES), sourceId: z.string().max(100).nullable() }),
  );
  const { sourceType, sourceId, ...input } = body;
  return Response.json(await createAnalysisSession(userId, { sourceType, sourceId }, input), { status: 201 });
});

// Resume the latest session for a source.
export const GET = route(async ({ userId, req }) => {
  const q = new URL(req.url).searchParams;
  const sourceType = z.enum(SESSION_SOURCES).parse(q.get('source_type'));
  const found = await findAnalysisSession(userId, sourceType, q.get('source_id'));
  if (!found) throw new DomainError('NOT_FOUND', 404, 'No saved analysis for that source.');
  return found;
});
