import { respondToInvite } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

// The invitee accepts or declines (P1-ST-30).
export const PUT = route<{ id: string }>(async ({ userId, req, params }) => {
  const { accept } = await readBody(req, z.object({ accept: z.boolean() }));
  await respondToInvite(userId, params.id, accept);
  return new Response(null, { status: 204 });
});
