import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';

// Mutable working copies of what a user analyzed (P1-AN-30..33,
// adr/2026-10-11-02). Live engine evals are never stored here.
export const analysisSessions = pgTable(
  'analysis_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(), // 'upload' | 'free' now; 'game' | 'puzzle' | 'study_chapter' later
    sourceId: text('source_id'), // upload: SHA-256 of the game text
    initialFen: text('initial_fen').notNull(),
    pgn: text('pgn').notNull(),
    lastPath: text('last_path').notNull().default(''), // where to resume
    lastPositionKey: text('last_position_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('analysis_sessions_user_updated').on(t.userId, t.updatedAt.desc()),
    index('analysis_sessions_user_source').on(t.userId, t.sourceType, t.sourceId),
  ],
);
