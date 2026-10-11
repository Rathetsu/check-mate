import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';

// Studies (studies spec). Chapters belong to their study and have no user_id:
// every read goes through studyAccess, and the owner is on `studies`.
export type StudySettings = {
  computer: boolean; // engine panel for non-owners
  cloneable: 'everyone' | 'contributors' | 'nobody';
  shareable: 'everyone' | 'contributors' | 'nobody'; // export
  sticky: boolean; // members follow the sync position by default
};
export const defaultStudySettings: StudySettings = {
  computer: true,
  cloneable: 'everyone',
  shareable: 'everyone',
  sticky: true,
};

export const studies = pgTable(
  'studies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    visibility: text('visibility').notNull().default('private'), // private | unlisted | public
    settings: jsonb('settings').$type<StudySettings>().notNull().default(defaultStudySettings),
    topics: text('topics')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    position: jsonb('position').$type<{ chapterId: string; path: string }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('studies_user_updated').on(t.userId, t.updatedAt.desc())],
);

export const studyChapters = pgTable(
  'study_chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studyId: uuid('study_id')
      .notNull()
      .references(() => studies.id, { onDelete: 'cascade' }),
    ord: integer('ord').notNull(),
    name: text('name').notNull(),
    orientation: text('orientation').notNull().default('white'),
    description: text('description').notNull().default(''),
    mode: text('mode').notNull().default('normal'), // normal | conceal | gamebook | practice
    pgn: text('pgn').notNull(), // the whole tree, CheckMate extensions included (ADR 2026-10-10-13)
    initialFen: text('initial_fen').notNull(),
    previewFen: text('preview_fen').notNull(), // end of the mainline: thumbnails and multiboard
    sourceType: text('source_type').notNull(), // blank | fen | pgn | lichess | copy
    sourceId: text('source_id'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  // ponytail: `ord` is a sort key, not unique; ties fall back to created_at.
  (t) => [index('study_chapters_study_ord').on(t.studyId, t.ord)],
);
