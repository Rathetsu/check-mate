// Tree ops (the board's one mutation path), glyphs and opening names.
import { describe, expect, test } from 'vitest';
import {
  applyOp,
  classifyLine,
  loadGame,
  loadOpenings,
  makePgn,
  practiceVerdict,
  toggleGlyph,
  TreeCursor,
  type TreeOp,
} from '../src/index.ts';

describe('applyOp', () => {
  test('every op is idempotent and the result round-trips through PGN', () => {
    const t = TreeCursor.fromFen();
    const e4 = applyOp(t, { op: 'addNode', path: '', uci: 'e2e4' });
    const e5 = applyOp(t, { op: 'addNode', path: e4, uci: 'e7e5' });
    const c5 = applyOp(t, { op: 'addNode', path: e4, uci: 'c7c5' });
    const ops: TreeOp[] = [
      { op: 'addNode', path: e4, uci: 'c7c5' },
      { op: 'promote', path: c5, toMainline: true },
      { op: 'setComment', path: c5, text: 'The Sicilian.' },
      { op: 'setNags', path: c5, nags: [3, 14] },
      { op: 'setShapes', path: c5, shapes: [{ orig: 'c5', dest: 'd4', brush: 'red' }] },
    ];
    for (const op of ops) applyOp(t, op);
    const once = makePgn(t);
    for (const op of ops) applyOp(t, op);
    expect(makePgn(t)).toBe(once);
    expect(once).toContain('1. e4 c5 $3 $14 { The Sicilian. [%cal Rc5d4] } ( 1... e5 ) *');
    const back = loadGame(once);
    expect(back.ok && makePgn(back.cursor)).toBe(once);

    applyOp(t, { op: 'deleteNode', path: e5 });
    expect(() => applyOp(t, { op: 'deleteNode', path: e5 })).toThrow(expect.objectContaining({ code: 'NODE_GONE' }));
  });

  test('normalizes: one move and one position glyph, valid shapes only', () => {
    const t = TreeCursor.fromFen();
    const p = applyOp(t, { op: 'addNode', path: '', uci: 'e2e4' });
    applyOp(t, { op: 'setNags', path: p, nags: [1, 2, 10, 146, 32, 146, 999] });
    expect(t.node.nags).toEqual([]); // cursor is still at the root
    expect(t.nodeAt(p)!.nags).toEqual([1, 10, 146, 32]);
    applyOp(t, {
      op: 'setShapes',
      path: p,
      shapes: [
        { orig: 'e4', brush: 'green' },
        { orig: 'e4', brush: 'red' }, // same square: last wins
        { orig: 'z9' as 'e4', brush: 'green' },
        { orig: 'd1', dest: 'd1', brush: 'blue' }, // an arrow to itself is a circle
      ],
    });
    expect(t.nodeAt(p)!.shapes).toEqual([
      { orig: 'e4', brush: 'red' },
      { orig: 'd1', brush: 'blue' },
    ]);
  });

  test('comment author comes from the caller, never the op', () => {
    const t = TreeCursor.fromFen();
    applyOp(t, { op: 'setComment', path: '', text: 'mine' }, 'user-1');
    expect(t.root.comments).toEqual([{ text: 'mine', by: 'user-1' }]);
  });
});

test('toggleGlyph keeps one move and one position glyph, any observations', () => {
  expect(toggleGlyph([1, 10], 2)).toEqual([10, 2]);
  expect(toggleGlyph([1, 10], 13)).toEqual([1, 13]);
  expect(toggleGlyph([146], 32)).toEqual([146, 32]);
  expect(toggleGlyph([146, 32], 146)).toEqual([32]);
});

test('classifyLine names the deepest known position, or nothing', async () => {
  const table = await loadOpenings();
  const t = TreeCursor.fromFen();
  for (const m of ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6', 'h2h3', 'h7h6'])
    t.play(m);
  const keys = t.nodesAlong().map((n) => n.positionKey);
  expect(classifyLine(table, keys)).toEqual({ eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, Adams Attack' });
  expect(classifyLine(table, keys.slice(0, 1))).toBeNull(); // the starting position has no name
});

describe('study ops (M1.4)', () => {
  const base = () => {
    const r = loadGame(
      '[Event "Lesson"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n[SetUp "1"]\n\n1. e4 { Push. } $1 ( 1. e3 { Slow. } ) 1... Kd7 *',
    );
    if (!r.ok) throw new Error(r.error.message);
    return r.cursor;
  };

  test('setTags replaces the header list but never the starting position', () => {
    const t = base();
    applyOp(t, {
      op: 'setTags',
      tags: [
        ['Event', 'Endgames'],
        ['Annotator', 'Me "the" author'],
      ],
    });
    expect([...t.headers]).toEqual([
      ['Event', 'Endgames'],
      ['Annotator', 'Me "the" author'],
      ['FEN', '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'],
      ['SetUp', '1'],
    ]);
    expect(() => applyOp(t, { op: 'setTags', tags: [['FEN', '8/8/8/8/8/8/8/K6k w - - 0 1']] })).toThrow(
      expect.objectContaining({ code: 'BAD_OP' }),
    );
    expect(() => applyOp(t, { op: 'setTags', tags: [['Bad Name', 'x']] })).toThrow(
      expect.objectContaining({ code: 'BAD_OP' }),
    );
  });

  test('setGamebook stores lesson text that survives PGN, and empty text removes it', () => {
    const t = base();
    const e4 = t.root.children[0]!.id;
    applyOp(t, { op: 'setGamebook', path: e4, hint: 'Push the pawn.', deviation: 'Too slow.' });
    const back = loadGame(makePgn(t, { extensions: true }));
    expect(back.ok && back.cursor.root.children[0]!.ext).toEqual({ hint: 'Push the pawn.', deviation: 'Too slow.' });
    expect(makePgn(t)).not.toContain('Push the pawn'); // plain export drops it
    applyOp(t, { op: 'setGamebook', path: e4, hint: '', deviation: '' });
    expect(t.root.children[0]!.ext).toBeUndefined();
  });

  test('clearAnnotations and clearVariations', () => {
    const t = base();
    t.goto(t.root.children[1]!.id); // inside the variation
    applyOp(t, { op: 'clearAnnotations' });
    expect(makePgn(t)).not.toMatch(/\{|\$/);
    applyOp(t, { op: 'clearVariations' });
    expect(makePgn(t)).toContain('1. e4 Kd7 *');
    expect(t.nodeCount).toBe(3);
    expect(t.path).toBe(''); // the cursor left the deleted variation
  });
});

test('practiceVerdict follows lila practiceCtrl thresholds', () => {
  const cp = (value: number) => ({ kind: 'cp' as const, value, pov: 'white' as const });
  expect(practiceVerdict('white', cp(30), cp(20))).toBe('good');
  expect(practiceVerdict('white', cp(30), cp(-30))).toBe('inaccuracy');
  expect(practiceVerdict('white', cp(30), cp(-120))).toBe('mistake');
  expect(practiceVerdict('white', cp(30), cp(-400))).toBe('blunder');
  expect(practiceVerdict('black', cp(30), cp(400))).toBe('blunder');
  expect(practiceVerdict('black', cp(30), { kind: 'mate', value: -3, pov: 'white' })).toBe('good');
});
