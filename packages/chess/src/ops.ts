// Tree operations: the only way the analysis board changes a tree. The same
// `applyOp` runs in the browser and, for studies, on the server, so both
// sides normalize identically (ADR 2026-10-11-04). Every op is idempotent:
// replaying it leaves the tree unchanged, so two people editing at once
// converge. An op on a path that no longer exists fails with NODE_GONE.
import { parseSquare } from 'chessops/util';
import { glyphById } from './glyphs.ts';
import { ChessError, countNodes, forEachNode, type Shape, type TreeCursor } from './tree.ts';

export type TreeOp =
  | { op: 'addNode'; path: string; uci: string }
  | { op: 'deleteNode'; path: string }
  | { op: 'promote'; path: string; toMainline: boolean }
  | { op: 'setComment'; path: string; text: string }
  | { op: 'setNags'; path: string; nags: number[] }
  | { op: 'setShapes'; path: string; shapes: Shape[] }
  // Studies (M1.4):
  | { op: 'setTags'; tags: [string, string][] }
  | { op: 'setGamebook'; path: string; hint: string; deviation: string }
  | { op: 'clearAnnotations' }
  | { op: 'clearVariations' };

export const MAX_COMMENT = 4_000;
export const MAX_SHAPES = 64;
export const MAX_TAGS = 50;
// Changing these would re-root the tree and move every path.
export const FIXED_TAGS = new Set(['FEN', 'SetUp', 'Variant']);
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
    case 'setTags':
      tree.headers = normalizeTags(tree.headers, op.tags);
      return tree.path;
    case 'setGamebook': {
      const node = tree.nodeAt(op.path);
      if (!node) throw new ChessError('NODE_GONE', 'That move no longer exists.');
      if (op.hint.length > MAX_COMMENT || op.deviation.length > MAX_COMMENT)
        throw new ChessError('TOO_LARGE', `Lesson text is limited to ${MAX_COMMENT.toLocaleString('en')} characters.`);
      const ext = { ...node.ext, hint: op.hint.trim(), deviation: op.deviation.trim() };
      for (const k of ['hint', 'deviation'] as const) if (!ext[k]) delete ext[k];
      if (Object.keys(ext).length) node.ext = ext;
      else delete node.ext;
      return op.path;
    }
    case 'clearAnnotations':
      forEachNode(tree.root, (n) => {
        n.comments = [];
        n.startingComments = [];
        n.nags = [];
        n.shapes = [];
      });
      return tree.path;
    case 'clearVariations':
      for (let n = tree.root; n.children.length; n = n.children[0]!) n.children = [n.children[0]!];
      tree.nodeCount = countNodes(tree.root);
      tree.path = tree.existingPath(tree.path);
      return tree.path;
  }
}

// The whole header list, in order. The tags that fix the starting position
// can't change, and must stay when present.
function normalizeTags(current: Map<string, string>, tags: [string, string][]): Map<string, string> {
  if (tags.length > MAX_TAGS) throw new ChessError('TOO_LARGE', `A chapter can have up to ${MAX_TAGS} tags.`);
  const next = new Map<string, string>();
  for (const [k, v] of tags) {
    if (!/^[A-Za-z0-9_]{1,40}$/.test(k) || v.length > 255 || /[\r\n]/.test(v))
      throw new ChessError('BAD_OP', `The tag ${k.slice(0, 40)} isn't valid.`);
    if (!FIXED_TAGS.has(k)) next.set(k, v.trim());
  }
  for (const k of FIXED_TAGS) {
    const tag = tags.find(([name]) => name === k);
    if (tag && tag[1] !== current.get(k))
      throw new ChessError('BAD_OP', `${k} can't be changed here. Start a new chapter from that position instead.`);
    const v = current.get(k);
    if (v !== undefined) next.set(k, v);
  }
  return next;
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
