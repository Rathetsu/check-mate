import { deleteStudy, getStudy, updateStudy } from '@checkmate/core';
import { publicRoute, readBody, route } from '@/lib/api';
import { studyPatch } from '../schemas';

type P = { id: string };

export const GET = publicRoute<P>(async ({ userId, params }) => getStudy(userId, params.id));

export const PATCH = route<P>(async ({ userId, req, params }) => {
  await updateStudy(userId, params.id, await readBody(req, studyPatch));
  return new Response(null, { status: 204 });
});

export const DELETE = route<P>(async ({ userId, params }) => {
  await deleteStudy(userId, params.id);
  return new Response(null, { status: 204 });
});
