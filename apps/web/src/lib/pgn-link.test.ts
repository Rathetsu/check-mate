// Full-PGN share links (P1-AN-21).
import { expect, test } from 'vitest';
import { decodePgn, encodePgn, MAX_LINK, pgnLink } from './pgn-link';

const PGN = '[Event "?"]\n\n1. e4 { Best by test. [%cal Ge2e4] } e5 ( 1... c5 2. Nf3 ) 2. Nf3 Nc6 *\n';

test('round-trips through a URL-safe hash', async () => {
  const hash = await encodePgn(PGN);
  expect(hash).toMatch(/^[\w-]+$/);
  expect(await decodePgn(hash)).toBe(PGN);
});

test('a link over the cap is never offered', async () => {
  expect(await pgnLink('https://checkmate.example', PGN)).toMatch(/^https:\/\/checkmate\.example\/analysis#pgn=/);
  // Pseudo-random text barely compresses.
  let seed = 1;
  const big = Array.from({ length: 12_000 }, () => ((seed = (seed * 48271) % 2147483647) % 36).toString(36)).join('');
  expect((await encodePgn(big)).length).toBeGreaterThan(MAX_LINK);
  expect(await pgnLink('https://checkmate.example', big)).toBeNull();
});

test('garbage in the hash throws instead of loading something else', async () => {
  await expect(decodePgn('not-a-link')).rejects.toThrow();
});
