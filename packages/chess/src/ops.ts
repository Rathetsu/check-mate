// Tree operations: the only way the analysis board changes a tree. The same
// `applyOp` runs in the browser and, for studies, on the server, so both
// sides normalize identically (ADR 2026-10-11-04). Every op is idempotent:
// replaying it leaves the tree unchanged, so two people editing at once
// converge. An op on a path that no longer exists fails with NODE_GONE.
import { parseSquare } from 'chessops/util';
import { glyphById } from './glyphs.ts';
import { ChessError, type Shape, type TreeCursor } from './tree.ts';

export type TreeOp =
  | { op: 'addNode'; path: string; uci: string }
  | { op: 'deleteNode'; path: string }
  | { op: 'promote'; path: string; toMainline: boolean }
  | { op: 'setComment'; path: string; text: string }
  | { op: 'setNags'; path: string; nags: number[] }
  | { op: 'setShapes'; path: string; shapes: Shape[] };

export const MAX_COMMENT = 4_000;
export const MAX_SHAPES = 64;
const BRUSHES = new Set(['green', 'red', 'yellow', 'blue']);

// Returns the path the op touched (for addNode, the new or followed child).
// `by` is the comment author, stamped by the caller, never by the op.
export function applyOp(tree: TreeCursor, op: TreeOp, by?: string): string {
  switch (op.op) {
    case 'addNode':
      return tree.addNode(op.path, op.uci);
    case 'deleteNode':
      tree.deleteNode(op.path);
      return op.path.slice(0, -2);
    case 'promote':
      tree.promote(op.path, op.toMainline);
      return op.path;
    case 'setComment':
      if (op.text.length > MAX_COMMENT)
        throw new ChessError('TOO_LARGE', `Comments are limited to ${MAX_COMMENT.toLocaleString('en')} characters.`);
      tree.setComment(op.path, op.text, by);
      return op.path;
    case 'setNags':
      tree.setNags(op.path, normalizeNags(op.nags));
      return op.path;
    case 'setShapes':
      tree.setShapes(op.path, normalizeShapes(op.shapes));
      return op.path;
  }
}

// One move glyph and one position glyph at most, as scalachess allows.
// Other valid NAGs (from imported PGN) pass through untouched.
function normalizeNags(nags: number[]): number[] {
  const seen = new Set<string>();
  return [...new Set(nags)].filter((n) => {
    const group = glyphById.get(n)?.group;
    if (!group) return Number.isInteger(n) && n > 0 && n < 256;
    if (group === 'observation') return true;
    if (seen.has(group)) return false;
    seen.add(group);
    return true;
  });
}

function normalizeShapes(shapes: Shape[]): Shape[] {
  const out = new Map<string, Shape>();
  for (const s of shapes) {
    if (parseSquare(s.orig) === undefined || (s.dest && parseSquare(s.dest) === undefined) || !BRUSHES.has(s.brush))
      continue;
    const dest = s.dest && s.dest !== s.orig ? s.dest : undefined;
    out.set(`${s.orig}${dest ?? ''}`, dest ? { orig: s.orig, dest, brush: s.brush } : { orig: s.orig, brush: s.brush });
  }
  return [...out.values()].slice(0, MAX_SHAPES);
}
