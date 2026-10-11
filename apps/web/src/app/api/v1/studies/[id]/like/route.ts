import { likeStudy } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

export const PUT = route<{ id: string }>(async ({ userId, req, params }) => {
  const { liked } = await readBody(req, z.object({ liked: z.boolean() }));
  return likeStudy(userId, params.id, liked);
});
