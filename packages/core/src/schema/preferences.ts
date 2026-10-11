import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { account, user } from './auth.ts';

// P1-AC-09. Values are validated by `preferencesSchema` in shared/.
export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull(),
  boardTheme: text('board_theme').notNull(),
  pieceSet: text('piece_set').notNull(),
  soundSet: text('sound_set').notNull(),
  showCoords: boolean('show_coords').notNull(),
  moveInput: text('move_input').notNull(),
  animationMs: integer('animation_ms').notNull(),
  showLegalDests: boolean('show_legal_dests').notNull(),
  boardSizePx: integer('board_size_px'),
  engineEnabled: boolean('engine_enabled').notNull().default(true),
  engineFlavor: text('engine_flavor').notNull(),
  engineMultipv: integer('engine_multipv').notNull().default(1),
  engineDepth: integer('engine_depth'), // null = infinite
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// P1-AC-11: exists from M1.0, filled in by Phase 3 linking.
export const externalAccounts = pgTable(
  'external_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(), // 'lichess' | 'chesscom'
    username: text('username').notNull(),
    platformUserId: text('platform_user_id'),
    authAccountId: text('auth_account_id').references(() => account.id, { onDelete: 'set null' }),
    needsReauth: boolean('needs_reauth').notNull().default(false),
    linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow().notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('external_accounts_user_platform_username').on(t.userId, t.platform, sql`lower(${t.username})`)],
);
