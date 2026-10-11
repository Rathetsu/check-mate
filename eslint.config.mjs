// Architecture boundaries are `no-restricted-imports` entries
// (2026-10-11-01-eslint-prettier-enforce-boundaries). ESLint doesn't merge
// a rule across config objects, so each scope below gets its full list.
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import llmDenylist from './scripts/llm-denylist.json' with { type: 'json' };

const group = (names, message) => ({ group: names, message });

const NO_LLM = group(llmDenylist, 'No LLM SDKs in this repo (CORE-04, 2026-10-10-03).');
const NO_CHESSGROUND = group(
  ['@lichess-org/chessground', '@lichess-org/chessground/*'],
  'Only <Board> may import chessground (P1-BD-11).',
);
const NO_STOCKFISH = group(
  ['stockfish', 'stockfish/*'],
  'Only the AnalysisProvider implementation in src/engine/ may use stockfish (CORE-22).',
);
const NO_DB = group(
  ['drizzle-orm', 'drizzle-orm/*', 'pg', 'postgres'],
  'Go through @checkmate/core services; apps never touch the DB (CORE-03).',
);
const NO_NODE = group(
  [
    'node:*',
    'fs',
    'fs/*',
    'path',
    'os',
    'child_process',
    'http',
    'https',
    'net',
    'crypto',
    'stream',
    'zlib',
    'worker_threads',
    'url',
  ],
  'No Node APIs here: this code runs in the browser too (CORE-02).',
);
const NO_UPWARD = group(
  ['@checkmate/core', '@checkmate/core/*', '@checkmate/web', '@checkmate/worker'],
  'packages/chess depends on nothing in the repo (CORE-01).',
);
const NO_DB_MODULE = group(
  ['**/db.ts', '**/auth.ts', '**/services/*'],
  'core/shared is imported by client code: pure modules only.',
);

const restrict = (...groups) => ({ 'no-restricted-imports': ['error', { patterns: groups }] });
const BASE = [NO_LLM, NO_CHESSGROUND, NO_STOCKFISH];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: 'apps/web' } },
    rules: {
      ...restrict(...BASE),
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  { files: ['apps/**'], rules: restrict(...BASE, NO_DB) },
  { files: ['apps/web/src/components/board/Board.tsx'], rules: restrict(NO_LLM, NO_STOCKFISH, NO_DB) },
  { files: ['apps/web/src/engine/**'], rules: restrict(NO_LLM, NO_CHESSGROUND, NO_DB) },
  { files: ['packages/chess/**'], rules: restrict(...BASE, NO_DB, NO_NODE, NO_UPWARD) },
  { files: ['packages/core/src/shared/**'], rules: restrict(...BASE, NO_DB, NO_NODE, NO_DB_MODULE) },
  globalIgnores([
    '**/.next/**',
    '**/node_modules/**',
    '**/next-env.d.ts',
    'packages/core/drizzle/**',
    'apps/web/src/components/ui/**',
    'apps/web/src/generated/**',
    'apps/web/public/**',
  ]),
]);
