// Tree ops (the board's one mutation path), glyphs and opening names.
import { describe, expect, test } from 'vitest';
import {
  applyOp,
  classifyLine,
  loadGame,
  loadOpenings,
  makePgn,
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
