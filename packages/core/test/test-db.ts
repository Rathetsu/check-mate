// Tests use their own database next to the dev one, so they never wipe dev data.
const base = process.env.DATABASE_URL ?? 'postgres://checkmate:checkmate@127.0.0.1:5432/checkmate';

export const baseDbUrl = base;
export const testDbUrl = base.replace(/\/[^/?]+(\?|$)/, '/checkmate_test$1');
