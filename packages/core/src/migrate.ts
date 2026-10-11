// Applies pending migrations. Run by the compose `migrate` service and
// `pnpm db:migrate`.
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './db.ts';

await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
await pool.end();
console.info('[migrate] done');
