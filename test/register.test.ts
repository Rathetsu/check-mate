import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  licenseAllowed,
  licenseAllowlist,
  matches,
  parseTables,
  registeredPackages,
} from '../scripts/check-register.ts';

const md = `
## Platform

| Component | Version | License | Mode | Notes |
|---|---|---|---|---|
| Next.js (\`next\`) | 16 | MIT | reused | \`proxy.ts\` |
| Types (\`@types/*\`) | — | MIT | reused (dev only) | |
| chess.js (\`chess.js\`) | 1.4 | BSD | not used | rejected |
`;

test('only used rows register their backticked npm names', () => {
  const names = registeredPackages(parseTables(md));
  expect(names).toEqual(['next', '@types/*']);
  expect(names.some((p) => matches('@types/react', p))).toBe(true);
  expect(names.some((p) => matches('chess.js', p))).toBe(false);
  expect(names.some((p) => matches('proxy.ts', p))).toBe(false);
});

test('SPDX expressions: OR needs one allowed, AND needs all', () => {
  const allow = new Set(['MIT', 'CC0-1.0']);
  expect(licenseAllowed('(MIT OR GPL-2.0)', allow)).toBe(true);
  expect(licenseAllowed('MIT AND GPL-2.0', allow)).toBe(false);
  expect(licenseAllowed('LGPL-2.1', allow)).toBe(false);
});

test('the real register parses: allowlist and core packages are found', () => {
  const register = readFileSync(new URL('../docs/wiki/open-source-reuse.md', import.meta.url), 'utf8');
  const allow = licenseAllowlist(register);
  expect(allow).toContain('MIT');
  expect(allow).toContain('AGPL-3.0-or-later');
  expect(allow).not.toContain('GPL-2.0');
  expect(registeredPackages(parseTables(register))).toEqual(
    expect.arrayContaining(['next', 'better-auth', '@lichess-org/chessground']),
  );
});
