import { MAX_SESSION_PGN } from '@checkmate/core';
import { z } from 'zod';

export const sessionBody = z.object({ pgn: z.string().min(1).max(MAX_SESSION_PGN), lastPath: z.string().max(40_000) });
