import { reorderChapters } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

export const POST = route<{ id: string }>(async ({ userId, req, params }) => {
  const { chapterIds } = await readBody(req, z.object({ chapterIds: z.array(z.string().max(40)).max(64) }));
  await reorderChapters(userId, params.id, chapterIds);
  return new Response(null, { status: 204 });
});
