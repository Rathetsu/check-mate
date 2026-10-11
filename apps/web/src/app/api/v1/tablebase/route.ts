import { probeTablebase } from '@checkmate/core';
import { z } from 'zod';
import { publicRoute } from '@/lib/api';

// P1-AN-51: 200 with the result, or 204 when the position isn't covered or
// the service is unavailable. Works signed out.
export const GET = publicRoute(async ({ req }) => {
  const fen = z.string().min(1).max(100).parse(new URL(req.url).searchParams.get('fen'));
  const result = await probeTablebase(fen);
  return result
    ? Response.json(result, { headers: { 'cache-control': 'public, max-age=86400' } })
    : new Response(null, { status: 204 });
});
