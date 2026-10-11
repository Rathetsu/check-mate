import { createStudy, listStudies } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';
import { chapterBody, name } from './schemas';

export const GET = route(async ({ userId, req }) =>
  listStudies(userId, { q: new URL(req.url).searchParams.get('q') ?? undefined }),
);

export const POST = route(async ({ userId, req }) => {
  const body = await readBody(req, z.object({ name, chapter: chapterBody.optional() }));
  return Response.json(await createStudy(userId, body.name, body.chapter), { status: 201 });
});
