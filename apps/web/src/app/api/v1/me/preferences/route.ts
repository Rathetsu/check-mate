import { getPreferences, putPreferences } from '@checkmate/core';
import { preferencesSchema } from '@checkmate/core/shared';
import { readBody, route } from '@/lib/api';

export const GET = route(async ({ userId }) => getPreferences(userId));

export const PUT = route(async ({ userId, req }) => putPreferences(userId, await readBody(req, preferencesSchema)));
