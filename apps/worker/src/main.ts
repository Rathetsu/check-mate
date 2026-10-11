// All long-running work runs here through pg-boss (CORE-60). Jobs are added
// as milestones need them; the first is the free-session purge in M1.2.
import { PgBoss } from 'pg-boss';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const boss = new PgBoss(url);
boss.on('error', (err) => console.error('[worker] pg-boss error', err));
await boss.start();
console.info('[worker] started');

const shutdown = async () => {
  await boss.stop({ graceful: true });
  process.exit(0);
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
