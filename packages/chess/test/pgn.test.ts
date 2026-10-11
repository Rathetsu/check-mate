// PGN import/export (P1-PG-01..31) on the fixture corpus.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { indexPgn, loadGame, makePgn, MAX_NODES, splitGames, TreeCursor, type PgnError } from '../src/index.ts';

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
const CORPUS = ['lichess-study.pgn', 'lichess-game.pgn', 'lichess-broadcast.pgn', 'chesscom-archive.pgn', 'quirks.pgn'];

const load = (text: string, index = 0) => {
  const r = loadGame(text, index);
  if (!r.ok) throw new Error(r.error.message);
  return r.cursor;
};

describe('round-trip (P1-PG-21)', () => {
  test.each(CORPUS)('%s: parse → write → parse gives an identical tree', (name) => {
    const text = fixture(name);
    const { games } = indexPgn(text);
    expect(games.length).toBeGreaterThan(0);
    for (const g of games) {
      expect(g.error).toBeUndefined();
      const first = load(text, g.index);
      const second = load(makePgn(first, { extensions: true }));
      expect(second.root).toEqual(first.root);
      expect([...second.headers]).toEqual([...first.headers]);
    }
  });

  test('keeps every header verbatim and in order', () => {
    const t = load(fixture('lichess-game.pgn'));
    expect([...t.headers.keys()].slice(0, 3)).toEqual(['Event', 'Site', 'Date']);
    expect(t.headers.get('Opening')).toBe('Caro-Kann Defense: Advance Variation');
  });

  test('reads comments, shapes, NAGs, clocks and imported evals', () => {
    const study = load(fixture('lichess-study.pgn'));
    expect(study.root.comments).toEqual([{ text: 'A short tour of the Italian.' }]);
    expect(study.root.shapes).toEqual([
      { orig: 'e4', brush: 'green' },
      { orig: 'd4', brush: 'green' },
    ]);
    const bc4 = study.nodeAt(mainlinePath(study, 5))!;
    expect(bc4.san).toBe('Bc4');
    expect(bc4.shapes).toEqual([{ orig: 'c4', dest: 'f7', brush: 'green' }]);
    const twoKnights = study.nodeAt(mainlinePath(study, 5))!.children[1]!;
    expect(twoKnights.san).toBe('Nf6');
    expect(twoKnights.comments[0]!.text).toBe('The Two Knights.');

    const game = load(fixture('lichess-game.pgn'));
    const e4 = game.root.children[0]!;
    expect(e4.clock).toBeGreaterThan(0);
    expect(e4.importedEval?.source).toBe('imported'); // P1-PG-40
    const last = game.nodesAlong(mainlinePath(game, 999)).at(-1)!;
    expect(last.importedEval?.score.kind).toBe('mate');
  });
});

const mainlinePath = (t: TreeCursor, plies: number) => {
  let path = '';
  for (let n = t.root.children[0]; n && plies-- > 0; n = n.children[0]) path += n.id;
  return path;
};

describe('malformed fixtures (P1-PG-03..05)', () => {
  test.each<[string, Partial<PgnError> | 'file']>([
    ['illegal-move.pgn', { code: 'ILLEGAL_MOVE', line: 7, column: 34, ply: 17, san: 'Nxd6' }],
    ['ambiguous-move.pgn', { code: 'AMBIGUOUS_MOVE', line: 3, column: 23, ply: 5, san: 'Nd2' }],
    ['bad-fen.pgn', { code: 'BAD_FEN_TAG', line: 3 }],
    ['chess960.pgn', { code: 'UNSUPPORTED_VARIANT', line: 2 }],
    ['truncated.pgn', { code: 'PGN_SYNTAX', line: 3, column: 31 }],
  ])('%s', (name, expected) => {
    const { games } = indexPgn(fixture(`malformed/${name}`));
    expect(games[0]!.error).toMatchObject(expected as object);
  });

  test('the message names the move (P1-PG-04)', () => {
    const { games } = indexPgn(fixture('malformed/illegal-move.pgn'));
    expect(games[0]!.error!.message).toBe('Move 9. Nxd6 is illegal in this position.');
  });

  test('an empty file is a file-level error', () => {
    expect(indexPgn(fixture('malformed/empty.pgn')).error?.code).toBe('PGN_SYNTAX');
  });

  test('one bad game does not stop the others', () => {
    const text = `${fixture('malformed/illegal-move.pgn')}\n${fixture('quirks.pgn')}`;
    const { games } = indexPgn(text);
    expect(games.map((g) => g.error?.code ?? 'ok')).toEqual(['ILLEGAL_MOVE', 'ok', 'ok', 'ok', 'ok']);
  });

  test('null moves are rejected (paths must stay stable)', () => {
    expect(loadGame('1. e4 -- 2. d4 *').ok).toBe(false);
  });
});

describe('quirks (P1-PG-06)', () => {
  const text = fixture('quirks.pgn');
  test('BOM, CRLF, zero castling, missing result, no blank line between games', () => {
    const { games } = indexPgn(text);
    expect(games.map((g) => Object.fromEntries(g.headers).Event)).toEqual([
      'Quirks 1: BOM, CRLF, zero castling, trailing spaces, no result',
      'Quirks 2: promotion without =',
      'Quirks 3: Chess.com clocks, no blank line before this game',
      'Quirks 4: blank line inside the movetext',
    ]);
    const castled = load(text, 0)
      .nodesAlong(mainlinePath(load(text, 0), 7))
      .at(-1)!;
    expect(castled.san).toBe('O-O');
  });

  test('promotion without = and Chess.com clocks', () => {
    expect(load(text, 1).root.children[0]!.san).toBe('a8=Q');
    expect(load(text, 2).root.children[0]!.clock).toBe(299.9);
  });

  test('a blank line inside movetext does not split the game', () => {
    expect(load(text, 3).nodeCount).toBe(5);
  });

  test('games without tags, separated by blank lines only', () => {
    expect(indexPgn('1. e4 e5 *\n\n1. d4 d5\n\n1. c4 *').games).toHaveLength(3);
  });

  test('an unclosed comment stops at the next game instead of swallowing it', () => {
    const games = splitGames('1. e4 { oops\n\n[Event "Next"]\n1. d4 *\n');
    expect(games).toHaveLength(2);
    expect(games[0]!.syntax?.line).toBe(1);
    expect(indexPgn('1. e4 { oops\n\n[Event "Next"]\n1. d4 *\n').games[1]!.error).toBeUndefined();
  });
});

describe('export (P1-PG-20, P1-PG-23)', () => {
  const study = () => load(fixture('lichess-study.pgn'));

  test('options drop variations, comments and clocks', () => {
    const t = study();
    expect(makePgn(t)).toContain('( 3... Nf6');
    expect(makePgn(t, { variations: false })).not.toContain('(');
    expect(makePgn(t, { comments: false })).not.toMatch(/\{|%cal/);
    const clocked = load(fixture('lichess-game.pgn'));
    expect(makePgn(clocked)).toContain('[%clk');
    expect(makePgn(clocked, { clocks: false })).not.toContain('[%clk');
  });

  test('CheckMate extensions are written only on request', () => {
    const t = study();
    t.setComment('', 'Opening note', 'user-1');
    t.root.ext = { hint: 'Look at f7 ] }' };
    const plain = makePgn(t);
    expect(plain).not.toContain('%cm-');
    const ext = makePgn(t, { extensions: true });
    expect(ext).toContain('[%cm-by user-1] Opening note');
    const back = load(ext);
    expect(back.root.ext).toEqual({ hint: 'Look at f7 ] }' });
    expect(back.root.comments).toContainEqual({ text: 'Opening note', by: 'user-1' });
  });

  test('a tree from a FEN writes SetUp and FEN', () => {
    const t = TreeCursor.fromFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
    t.play('e1g1');
    const pgn = makePgn(t);
    expect(pgn).toContain('[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]');
    expect(pgn).toContain('1. O-O');
  });
});

describe('limits (P1-PG-30, P1-PG-31)', () => {
  // No move numbers: chessops reads "10000." as the null move 0000.
  const shuffle = (moves: number) =>
    Array.from({ length: moves }, (_, i) => ['Nf3', 'Nf6', 'Ng1', 'Ng8'][i % 4]!).join(' ');

  test('a game over 20,000 moves is refused', () => {
    const r = loadGame(`${shuffle(MAX_NODES)} *`);
    expect(!r.ok && r.error.code).toBe('TOO_LARGE');
  });

  test('more than 5,000 games is refused', () => {
    expect(indexPgn('1. e4 *\n\n'.repeat(5_001)).error?.code).toBe('TOO_LARGE');
  });

  // M1.4 parses and writes the whole chapter for every op (ADR 2026-10-11-04).
  test('parse + write of a 500 KB, ~20k-node chapter stays cheap', () => {
    const text = `${shuffle(MAX_NODES - 1).replace(/ (Ng[18])/g, ' $1 { a comment long enough to make this a 500 KB chapter }')} *`;
    expect(text.length).toBeGreaterThan(500_000);
    const t0 = performance.now();
    const tree = load(text);
    makePgn(tree, { extensions: true });
    const ms = performance.now() - t0;
    console.info(
      `[bench] parse + write ${tree.nodeCount} nodes, ${Math.round(text.length / 1024)} KB: ${Math.round(ms)} ms`,
    );
    expect(ms).toBeLessThan(2_000);
  });
});
