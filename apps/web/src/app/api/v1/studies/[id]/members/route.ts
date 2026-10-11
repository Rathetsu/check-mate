import { inviteMember } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

// P1-ST-30: the owner invites by username.
export const POST = route<{ id: string }>(async ({ userId, req, params }) => {
  const body = await readBody(
    req,
    z.object({ username: z.string().trim().min(1).max(40), role: z.enum(['contributor', 'viewer']) }),
  );
  return Response.json(await inviteMember(userId, params.id, body.username, body.role), { status: 201 });
});
