import { removeMember, setMemberRole } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

type P = { id: string; userId: string };

export const PATCH = route<P>(async ({ userId, req, params }) => {
  const { role } = await readBody(req, z.object({ role: z.enum(['contributor', 'viewer']) }));
  await setMemberRole(userId, params.id, params.userId, role);
  return new Response(null, { status: 204 });
});

// The owner removes a member; a member removes themself (leave).
export const DELETE = route<P>(async ({ userId, params }) => {
  await removeMember(userId, params.id, params.userId);
  return new Response(null, { status: 204 });
});
