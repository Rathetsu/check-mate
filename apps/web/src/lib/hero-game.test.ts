// Home hero frames and ticker (home-motion spec).
import { loadOpenings, validateSetup, fenFromUrl } from '@checkmate/chess';
import { expect, test } from 'vitest';
import { heroFrames, tickerOpenings } from './hero-game';

test('the Opera Game replays to a mate on e8', async () => {
  const frames = heroFrames(await loadOpenings());
  expect(frames).toHaveLength(34); // the start plus 33 moves
  expect(frames.at(-1)).toMatchObject({ move: '17. Rd8#', mated: 4, beat: true });
  expect(frames.slice(0, -1).every((f) => f.mated === null)).toBe(true);
  expect(frames[4]!.opening).toBe('Philidor Defense'); // 2... d6
});

test('slides follow castling and captures', async () => {
  const frames = heroFrames(await loadOpenings());
  const at = (move: string) => frames.find((f) => f.move === move)!;
  // 12. O-O-O: king e1-c1 and rook a1-d1 (a8 = 0, so rank 1 starts at 56).
  expect(at('12. O-O-O').slides).toEqual([
    [60, 58],
    [56, 59],
  ]);
  expect(at('12. O-O-O').changed).toEqual([56, 58, 59, 60]);
  // 13. Rxd7: one slide, the captured knight just goes.
  expect(at('13. Rxd7').slides).toEqual([[59, 11]]);
});

test('every ticker opening opens on the board', async () => {
  const items = tickerOpenings(await loadOpenings());
  expect(items).toHaveLength(20);
  expect(items.slice(0, 2).map((i) => i.side)).toEqual(['white', 'black']);
  for (const { href } of items) expect(validateSetup(fenFromUrl(href.slice('/analysis/'.length))).ok).toBe(true);
});
