import { createStudy, listStudies, STUDY_SORTS, STUDY_TABS } from '@checkmate/core';
import { z } from 'zod';
import { publicRoute, readBody, route } from '@/lib/api';
import { chapterBody, name } from './schemas';

const listQuery = z.object({
  tab: z.enum(STUDY_TABS).optional(),
  q: z.string().max(100).optional(),
  topic: z.string().max(40).optional(),
  sort: z.enum(STUDY_SORTS).optional(),
  page: z.coerce.number().int().min(0).max(1000).optional(),
});

// P1-ST-22: signed-out visitors can list public studies.
export const GET = publicRoute(async ({ userId, req }) =>
  listStudies(userId, listQuery.parse(Object.fromEntries(new URL(req.url).searchParams))),
);

export const POST = route(async ({ userId, req }) => {
  const body = await readBody(req, z.object({ name, chapter: chapterBody.optional() }));
  return Response.json(await createStudy(userId, body.name, body.chapter), { status: 201 });
});
