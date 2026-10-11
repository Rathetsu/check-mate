// Internal to packages/core: apps never import this (CORE-03). The pool
// connects lazily, so importing it at build time needs no database.
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.ts';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
export type Db = typeof db;
