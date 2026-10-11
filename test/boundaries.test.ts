// Proves each architecture boundary rule fires (core-architecture acceptance
// criteria, 2026-10-11-01). Files are virtual; ESLint applies the config by path.
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';

const eslint = new ESLint({ cwd: new URL('..', import.meta.url).pathname });

async function restricted(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result!.messages.filter((m) => m.ruleId === 'no-restricted-imports').length > 0;
}

test.each([
  [
    'apps/web/src/app/page.tsx',
    "import { drizzle } from 'drizzle-orm/node-postgres';",
    'apps import a DB client (CORE-03)',
  ],
  ['apps/worker/src/main.ts', "import pg from 'pg';", 'worker imports a DB client (CORE-03)'],
  ['packages/chess/src/fen.ts', "import { readFileSync } from 'node:fs';", 'chess imports Node APIs (CORE-02)'],
  ['packages/chess/src/fen.ts', "import { auth } from '@checkmate/core';", 'chess imports core (CORE-01)'],
  [
    'apps/web/src/components/analysis/x.tsx',
    "import { Chessground } from '@lichess-org/chessground';",
    'chessground outside <Board> (P1-BD-11)',
  ],
  ['apps/web/src/app/page.tsx', "import sf from 'stockfish';", 'stockfish outside the provider (CORE-22)'],
  ['packages/core/src/services/x.ts', "import OpenAI from 'openai';", 'an LLM SDK (CORE-04)'],
  ['packages/core/src/shared/x.ts', "import { db } from '../db.ts';", 'core/shared imports the db'],
])('%s: blocks %s', async (file, code) => {
  expect(await restricted(file, code)).toBe(true);
});

test.each([
  ['apps/web/src/components/board/Board.tsx', "import { Chessground } from '@lichess-org/chessground';"],
  ['apps/web/src/engine/browser-stockfish.ts', "import sf from 'stockfish';"],
  ['packages/core/src/db.ts', "import pg from 'pg';"],
  ['packages/chess/test/pgn.test.ts', "import { readFileSync } from 'node:fs';"],
  ['apps/web/src/app/page.tsx', "import { getMe } from '@checkmate/core';"],
])('%s: allows its own import', async (file, code) => {
  expect(await restricted(file, code)).toBe(false);
});
