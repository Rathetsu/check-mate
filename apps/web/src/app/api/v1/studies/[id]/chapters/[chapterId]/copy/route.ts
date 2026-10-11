import { copyChapter } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

export const POST = route<{ id: string; chapterId: string }>(async ({ userId, req, params }) => {
  const { toStudyId } = await readBody(req, z.object({ toStudyId: z.string().max(40) }));
  return Response.json(await copyChapter(userId, params.id, params.chapterId, toStudyId), { status: 201 });
});
