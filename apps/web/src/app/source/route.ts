import { SOURCE_URL } from '@/lib/site';

// AGPL §13: /source always points at the exact deployed commit.
export const GET = () => Response.redirect(SOURCE_URL, 307);
