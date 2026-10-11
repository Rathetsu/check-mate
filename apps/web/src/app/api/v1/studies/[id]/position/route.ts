import { setStudyPosition } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

// P1-ST-13 / P1-ST-32: the remembered position and the sync target.
export const PUT = route<{ id: string }>(async ({ userId, req, params }) => {
  const body = await readBody(req, z.object({ chapterId: z.string().max(40), path: z.string().max(40_000) }));
  await setStudyPosition(userId, params.id, body);
  return new Response(null, { status: 204 });
});
