// P1-AN-33: free-analysis sessions untouched for 90 days are deleted daily.
import { purgeFreeAnalysisSessions } from '@checkmate/core';
import type { PgBoss } from 'pg-boss';

const QUEUE = 'analysis-sessions-purge';

export async function register(boss: PgBoss) {
  await boss.createQueue(QUEUE);
  await boss.schedule(QUEUE, '17 3 * * *'); // daily, 03:17 UTC
  await boss.work(QUEUE, async () => {
    console.info(`[worker] purged ${await purgeFreeAnalysisSessions(90)} free analysis sessions`);
  });
}
