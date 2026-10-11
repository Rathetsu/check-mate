import { patchAnalysisSession } from '@checkmate/core';
import { readBody, route } from '@/lib/api';
import { sessionBody } from '../schema';

// Autosave (P1-AN-31): overwrites the working copy. Another user's id is a 404.
export const PATCH = route<{ id: string }>(async ({ userId, req, params }) => {
  await patchAnalysisSession(userId, params.id, await readBody(req, sessionBody));
  return new Response(null, { status: 204 });
});
