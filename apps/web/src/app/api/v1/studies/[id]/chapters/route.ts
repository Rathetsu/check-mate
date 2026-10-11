import { createChapters } from '@checkmate/core';
import { readBody, route } from '@/lib/api';
import { chapterBody } from '../../schemas';

// P1-ST-02: every chapter source goes through createChapters.
export const POST = route<{ id: string }>(async ({ userId, req, params }) =>
  Response.json(await createChapters(userId, params.id, await readBody(req, chapterBody)), { status: 201 }),
);
