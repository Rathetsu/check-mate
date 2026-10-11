// TreeCursor (P1-BD-20..24) and the fake provider (CORE-23).
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { ChessError, createFakeProvider, INITIAL_FEN, loadGame, makePgn, TreeCursor } from '../src/index.ts';

const study = () => {
  const r = loadGame(readFileSync(new URL('../fixtures/lichess-study.pgn', import.meta.url), 'utf8'));
  if (!r.ok) throw new Error(r.error.message);
  return r.cursor;
};
const sans = (t: TreeCursor, path = t.path) =>
  t
    .nodesAlong(path)
    .slice(1)
    .map((n) => n.san);
const pathOf = (t: TreeCursor, moves: string[]) => {
  let node = t.root;
  let path = '';
  for (const san of moves) {
    node = node.children.find((c) => c.san === san)!;
    path += node.id;
  }
  return path;
};

describe('TreeCursor', () => {
  test('play follows an existing child or adds a variation (P1-AN-01)', () => {
    const t = TreeCursor.fromFen();
    t.play('e2e4');
    t.play('e7e5');
    t.first();
    t.play('e2e4'); // follows
    expect(t.root.children).toHaveLength(1);
    t.play('c7c5'); // new variation
    expect(t.nodeAt(t.root.children[0]!.id)!.children.map((c) => c.san)).toEqual(['e5', 'c5']);
    expect(t.nodeCount).toBe(4);
  });

  test('navigation', () => {
    const t = study();
    t.last();
    expect(sans(t).at(-1)).toBe('c6');
    t.prev();
    expect(t.node.san).toBe('Rfe1');
    t.first();
    expect(t.path).toBe('');
    t.goto(pathOf(t, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']));
    t.nextVariation();
    expect(t.node.san).toBe('Nf6');
    t.prevVariation();
    expect(t.node.san).toBe('Bc5');
    t.next();
    expect(t.node.san).toBe('c3');
  });

  test('promote one level, then to the mainline, then round-trip (chessboard spec)', () => {
    const t = study();
    const deep = pathOf(t, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'd4']);
    t.promote(deep, false);
    expect(sans(t, t.existingPath(deep))).toContain('Nxd5');
    expect(t.nodeAt(deep.slice(0, -2))!.children[0]!.san).toBe('d4');
    t.promote(deep, true);
    expect(sans(t, pathOf(t, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])).length).toBe(5);
    expect(t.root.children[0]!.children[0]!.children[0]!.children[0]!.children[0]!.children[0]!.san).toBe('Nf6');

    const pgn = makePgn(t);
    const back = loadGame(pgn);
    expect(back.ok && makePgn(back.cursor)).toBe(pgn);
    // The comment that introduced 6. d4 now sits on 5... Nxd5, as a re-parse puts it.
    expect(back.ok && back.cursor.root).toEqual(t.root);
  });

  test('deleteNode removes the subtree and moves the cursor out of it', () => {
    const t = study();
    const before = t.nodeCount;
    const nf6 = pathOf(t, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
    t.goto(nf6 + t.nodeAt(nf6)!.children[0]!.id);
    t.deleteNode(nf6);
    expect(t.path).toBe(nf6.slice(0, -2));
    expect(t.nodeCount).toBe(before - 14);
    expect(() => t.deleteNode(nf6)).toThrow(ChessError);
  });

  test('comments are one per author; nags are a set', () => {
    const t = TreeCursor.fromFen();
    const p = t.play('e2e4');
    t.setComment(p, ' Best by test ');
    t.setComment(p, 'Agreed', 'u1');
    t.setComment(p, 'Updated', 'u1');
    expect(t.node.comments).toEqual([{ text: 'Best by test' }, { text: 'Updated', by: 'u1' }]);
    t.setComment(p, '');
    expect(t.node.comments).toEqual([{ text: 'Updated', by: 'u1' }]);
    t.setNags(p, [1, 1, 14]);
    expect(t.node.nags).toEqual([1, 14]);
  });

  test('ops on a missing path fail with NODE_GONE; illegal moves with ILLEGAL_MOVE', () => {
    const t = TreeCursor.fromFen();
    expect(() => t.addNode('zz', 'e2e4')).toThrow(expect.objectContaining({ code: 'NODE_GONE' }));
    expect(() => t.addNode('', 'e2e5')).toThrow(expect.objectContaining({ code: 'ILLEGAL_MOVE' }));
  });

  test('a black-to-move start numbers moves correctly', () => {
    const t = TreeCursor.fromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    t.play('e7e5');
    t.play('g1f3');
    expect(makePgn(t)).toContain('1... e5 2. Nf3');
  });

  test('ids are stable across a re-parse (studies address nodes by path)', () => {
    const t = study();
    const back = loadGame(makePgn(t, { extensions: true }));
    expect(back.ok && back.cursor.nodeAt(pathOf(t, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5']))?.san).toBe('Ng5');
  });
});

describe('createFakeProvider (CORE-23)', () => {
  test('is deterministic and legal', async () => {
    const fake = createFakeProvider();
    const a = await fake.getBestMoves(INITIAL_FEN, { multiPv: 3 });
    const b = await fake.getBestMoves(INITIAL_FEN, { multiPv: 3 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(a[0]!.provenance.provider).toBe('fake');
  });

  test('streams updates and stops when cancelled', async () => {
    const fake = createFakeProvider({ steps: 3 });
    const depths: number[] = [];
    await new Promise<void>((done) => {
      fake.analyzePosition(INITIAL_FEN, {
        multiPv: 1,
        depth: null,
        onUpdate: (lines) => {
          depths.push(lines[0]!.depth);
          if (depths.length === 3) done();
        },
      });
    });
    expect(depths).toEqual([10, 20, 30]);
  });

  test('validateVariation checks legality before any engine (CORE-20)', async () => {
    const fake = createFakeProvider();
    expect(await fake.validateVariation(INITIAL_FEN, ['e2e4', 'e7e5', 'e1e3'], { depth: 10 })).toMatchObject({
      legal: false,
      firstIllegalPly: 3,
    });
    const ok = await fake.validateVariation(INITIAL_FEN, ['e2e4', 'e7e5'], { depth: 10 });
    expect(ok.legal && ok.evals).toHaveLength(2);
  });
});
