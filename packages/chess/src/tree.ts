// The game tree and its cursor (P1-BD-20..24), modelled on lila's tree:
// node ids are 2-character move codes and a path is the ids from the root
// joined together. Pure data, no React; the web app re-renders after each
// mutation.
import type { Chess } from 'chessops/chess';
import type { SquareName } from 'chessops/types';
import type { Score } from './analysis.ts';
import { INITIAL_FEN, initialPly, makeFen, validateSetup } from './fen.ts';
import { positionKey } from './keys.ts';
import { applyUci, type Played } from './moves.ts';

export type Brush = 'green' | 'red' | 'yellow' | 'blue';
export type Shape = { orig: SquareName; dest?: SquareName; brush: Brush };
export type NodeComment = { text: string; by?: string };
export type ImportedEval = { score: Score; depth?: number; source: 'imported' }; // P1-PG-40

export interface TreeNode {
  id: string; // '' for the root
  ply: number;
  uci: string;
  san: string;
  fen: string;
  positionKey: string;
  comments: NodeComment[];
  startingComments: string[];
  nags: number[];
  shapes: Shape[];
  clock?: number;
  emt?: number;
  importedEval?: ImportedEval;
  ext?: Record<string, string>; // CheckMate `[%cm-*]` data, e.g. gamebook hints
  children: TreeNode[]; // children[0] is the mainline
}

export const MAX_NODES = 20_000; // P1-PG-31

export type ChessErrorCode = 'ILLEGAL_MOVE' | 'NODE_GONE' | 'TOO_LARGE' | 'BAD_FEN';
export class ChessError extends Error {
  readonly code: ChessErrorCode;
  constructor(code: ChessErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function rootNode(pos: Chess, fen: string): TreeNode {
  return {
    id: '',
    ply: initialPly(fen),
    uci: '',
    san: '',
    fen,
    positionKey: positionKey(pos),
    comments: [],
    startingComments: [],
    nags: [],
    shapes: [],
    children: [],
  };
}

export function childNode(parent: TreeNode, played: Played): TreeNode {
  return {
    id: played.id,
    ply: parent.ply + 1,
    uci: played.uci,
    san: played.san,
    fen: makeFen(played.pos),
    positionKey: positionKey(played.pos),
    comments: [],
    startingComments: [],
    nags: [],
    shapes: [],
    children: [],
  };
}

export function positionOf(node: TreeNode): Chess {
  const r = validateSetup(node.fen);
  if (!r.ok) throw new ChessError('BAD_FEN', `Corrupt tree node at ply ${node.ply}.`);
  return r.pos;
}

export function countNodes(root: TreeNode): number {
  let n = 0;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop()!;
    n++;
    for (const c of node.children) stack.push(c);
  }
  return n;
}

export const parentPath = (path: string): string => path.slice(0, -2);

// PGN can only put a comment before a variation's first move. When a node
// becomes the mainline move, its leading comments move onto the parent, the
// same place a re-parse would put them, so browser and server trees agree.
function settle(parent: TreeNode): void {
  const main = parent.children[0];
  if (!main?.startingComments.length) return;
  parent.comments.push(...main.startingComments.map((text) => ({ text })));
  main.startingComments = [];
}

export class TreeCursor {
  root: TreeNode;
  headers: Map<string, string>;
  path = '';
  nodeCount: number;

  constructor(root: TreeNode, headers: Map<string, string> = new Map(), nodeCount = countNodes(root)) {
    this.root = root;
    this.headers = headers;
    this.nodeCount = nodeCount;
  }

  // A new tree gets the Seven Tag Roster so exports are well-formed PGN.
  static fromFen(fen: string = INITIAL_FEN): TreeCursor {
    const r = validateSetup(fen);
    if (!r.ok) throw new ChessError('BAD_FEN', r.reasons.map((x) => x.message).join(' '));
    const headers = new Map([
      ['Event', '?'],
      ['Site', '?'],
      ['Date', '????.??.??'],
      ['Round', '?'],
      ['White', '?'],
      ['Black', '?'],
      ['Result', '*'],
    ]);
    if (r.fen !== INITIAL_FEN) {
      headers.set('SetUp', '1');
      headers.set('FEN', r.fen);
    }
    return new TreeCursor(rootNode(r.pos, r.fen), headers, 1);
  }

  get node(): TreeNode {
    return this.nodeAt(this.path) ?? this.root;
  }

  nodeAt(path: string): TreeNode | undefined {
    let node = this.root;
    for (let i = 0; i < path.length; i += 2) {
      const id = path.slice(i, i + 2);
      const next = node.children.find((c) => c.id === id);
      if (!next) return undefined;
      node = next;
    }
    return node;
  }

  // Root first, ending at `path` (or where it stops existing).
  nodesAlong(path: string = this.path): TreeNode[] {
    const nodes = [this.root];
    for (let i = 0; i < path.length; i += 2) {
      const next = nodes[nodes.length - 1]!.children.find((c) => c.id === path.slice(i, i + 2));
      if (!next) break;
      nodes.push(next);
    }
    return nodes;
  }

  // The nearest existing ancestor of a path that may have been deleted.
  existingPath(path: string): string {
    return this.nodesAlong(path)
      .slice(1)
      .map((n) => n.id)
      .join('');
  }

  // --- mutations (also reachable as ops, see ops.ts) ---

  // Follows an existing child or adds one; returns the child's path.
  addNode(path: string, uci: string): string {
    const parent = this.nodeAt(path);
    if (!parent) throw new ChessError('NODE_GONE', 'That move no longer exists.');
    const played = applyUci(positionOf(parent), uci);
    if (!played) throw new ChessError('ILLEGAL_MOVE', `${uci} is illegal in this position.`);
    if (!parent.children.some((c) => c.id === played.id)) {
      if (this.nodeCount >= MAX_NODES)
        throw new ChessError(
          'TOO_LARGE',
          `This analysis has reached the limit of ${MAX_NODES.toLocaleString('en')} moves.`,
        );
      parent.children.push(childNode(parent, played));
      this.nodeCount++;
    }
    return path + played.id;
  }

  deleteNode(path: string): void {
    const parent = this.nodeAt(parentPath(path));
    const idx = parent?.children.findIndex((c) => c.id === path.slice(-2)) ?? -1;
    if (!path || !parent || idx < 0) throw new ChessError('NODE_GONE', 'That move no longer exists.');
    const [gone] = parent.children.splice(idx, 1);
    this.nodeCount -= countNodes(gone!);
    settle(parent);
    if (this.path.startsWith(path)) this.path = parentPath(path);
  }

  // lila's promoteAt: lift the line one fork up, or to the mainline.
  promote(path: string, toMainline: boolean): void {
    if (!this.nodeAt(path)) throw new ChessError('NODE_GONE', 'That move no longer exists.');
    for (let p = path; p.length > 0; p = parentPath(p)) {
      const siblings = this.nodeAt(parentPath(p))!.children;
      const idx = siblings.findIndex((c) => c.id === p.slice(-2));
      if (idx > 0) {
        siblings.unshift(...siblings.splice(idx, 1));
        settle(this.nodeAt(parentPath(p))!);
        if (!toMainline) return;
      }
    }
  }

  // One comment per author; empty text removes it.
  setComment(path: string, text: string, by?: string): void {
    const node = this.mustGet(path);
    const idx = node.comments.findIndex((c) => c.by === by);
    const trimmed = text.trim();
    if (!trimmed) {
      if (idx >= 0) node.comments.splice(idx, 1);
    } else if (idx >= 0) node.comments[idx] = by ? { text: trimmed, by } : { text: trimmed };
    else node.comments.push(by ? { text: trimmed, by } : { text: trimmed });
  }

  setNags(path: string, nags: number[]): void {
    this.mustGet(path).nags = [...new Set(nags)];
  }

  toggleNag(path: string, nag: number): void {
    const node = this.mustGet(path);
    this.setNags(path, node.nags.includes(nag) ? node.nags.filter((n) => n !== nag) : [...node.nags, nag]);
  }

  setShapes(path: string, shapes: Shape[]): void {
    this.mustGet(path).shapes = shapes;
  }

  // --- navigation (P1-BD-22) ---

  play(uci: string): string {
    this.path = this.addNode(this.path, uci);
    return this.path;
  }

  goto(path: string): void {
    if (this.nodeAt(path)) this.path = path;
  }
  next(): void {
    const child = this.node.children[0];
    if (child) this.path += child.id;
  }
  prev(): void {
    this.path = parentPath(this.path);
  }
  first(): void {
    this.path = '';
  }
  last(): void {
    for (let n = this.node.children[0]; n; n = n.children[0]) this.path += n.id;
  }
  nextVariation(): void {
    this.sibling(1);
  }
  prevVariation(): void {
    this.sibling(-1);
  }

  private sibling(step: 1 | -1): void {
    if (!this.path) return;
    const siblings = this.nodeAt(parentPath(this.path))!.children;
    const idx = siblings.findIndex((c) => c.id === this.path.slice(-2));
    const target = siblings[idx + step];
    if (target) this.path = parentPath(this.path) + target.id;
  }

  private mustGet(path: string): TreeNode {
    const node = this.nodeAt(path);
    if (!node) throw new ChessError('NODE_GONE', 'That move no longer exists.');
    return node;
  }
}
