export const REPO_URL = 'https://github.com/Rathetsu/check-mate';
export const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'unknown';

// AGPL §13: the Source link points at the exact deployed commit (P1-UI-08).
export const SOURCE_URL = /^[0-9a-f]{7,40}$/.test(COMMIT_SHA) ? `${REPO_URL}/tree/${COMMIT_SHA}` : REPO_URL;
