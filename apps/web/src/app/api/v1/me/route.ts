import { auth, DomainError, getMe } from '@checkmate/core';
import { z } from 'zod';
import { readBody, route } from '@/lib/api';

export const GET = route(async ({ userId }) => {
  const me = await getMe(userId);
  if (!me) throw new DomainError('NOT_FOUND', 404, 'Account not found.');
  return me;
});

// P1-AC-10: password-confirmed deletion. FK cascades remove every user-owned row.
export const DELETE = route(async ({ req }) => {
  const { password } = await readBody(req, z.object({ password: z.string().min(1) }));
  const { headers } = await auth.api.deleteUser({ body: { password }, headers: req.headers, returnHeaders: true });
  return new Response(null, { status: 204, headers }); // clears the session cookie
});
