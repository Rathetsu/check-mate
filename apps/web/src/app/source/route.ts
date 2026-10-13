import { REPO_URL } from '@/lib/site';

// AGPL §13: /source points at the public repo.
export const GET = () => Response.redirect(REPO_URL, 307);
