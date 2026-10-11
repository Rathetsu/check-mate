import { cloneStudy } from '@checkmate/core';
import { route } from '@/lib/api';

// P1-ST-20: a private copy for the caller.
export const POST = route<{ id: string }>(async ({ userId, params }) =>
  Response.json(await cloneStudy(userId, params.id), { status: 201 }),
);
