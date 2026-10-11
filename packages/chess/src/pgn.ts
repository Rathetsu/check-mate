// PGN import and export (P1-PG-01..31) over chessops' parser. chessops has no
// line numbers, splits games only on blank lines, and doesn't check legality,
// so this file splits games itself, replays every move through the rules
// layer, and finds each error's line and column.
import type { Chess } from 'chessops/chess';
import {
  ChildNode,
  emptyHeaders,
  makeComment,
  makePgn as cMakePgn,
  Node,
  parseComment,
  parsePgn as cParsePgn,
  type Comment,
  type Game,
  type PgnNodeData,
} from 'chessops/pgn';
import { makeSquare, parseSquare } from 'chessops/util';
import { INITIAL_FEN, initialPly, looksLike960, parseSetup, validateSetup } from './fen.ts';
import { applySan, isMoveError } from './moves.ts';
import { childNode, MAX_NODES, rootNode, TreeCursor, type Brush, type NodeComment, type TreeNode } from './tree.ts';

export type PgnErrorCode =
  'PGN_SYNTAX' | 'ILLEGAL_MOVE' | 'AMBIGUOUS_MOVE' | 'BAD_FEN_TAG' | 'UNSUPPORTED_VARIANT' | 'TOO_LARGE';
export type PgnError = {
  gameIndex: number;
  line: number;
  column: number;
  ply?: number;
  san?: string;
  code: PgnErrorCode;
  message: string;
};

// P1-PG-30: in-browser limits. Bigger files go to the library import (P3).
export const MAX_PGN_CHARS = 10 * 1024 * 1024;
export const MAX_GAMES = 5_000;

// ---------- splitting ----------

export type RawGame = {
  index: number;
  line: number; // 1-based line where the game starts
  text: string; // header lines, then movetext with blank lines removed
  lineMap: number[]; // text line → original line
  movesFrom: number; // first movetext line in `text`
  syntax?: { line: number; column: number; message: string };
};

const HEADER = /^\s*\[[A-Za-z0-9][A-Za-z0-9_+#=:-]*\s+"/;
const RESULT_AT_END = /(?:^|\s)(?:1-0|0-1|1\/2-1\/2|\*)\s*$/;
const BLANK = /^\s*$/;
type Pos = { line: number; column: number };

// A new game starts at a tag line that follows movetext, with or without a
// blank line between. Games without tags are split at a blank line when the
// movetext so far ended with a result, or the next line restarts at "1.".
// Other blank lines inside movetext are dropped, because chessops would end
// the game there. An unclosed `{` ends at the next tag line that follows a
// blank line, instead of swallowing the rest of the file.
export function splitGames(input: string): RawGame[] {
  const lines = input.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  const games: RawGame[] = [];
  type Cur = { line: number; lines: string[]; map: number[]; movesFrom: number; comment?: Pos; parens: Pos[] };
  let cur: Cur | undefined;
  let prevBlank = true;
  let endedWithResult = false;

  const flush = () => {
    if (!cur) return;
    const syntax = cur.comment
      ? { ...cur.comment, message: 'A comment that starts here is never closed with "}".' }
      : cur.parens[0]
        ? { ...cur.parens[0], message: 'A variation that starts here is never closed with ")".' }
        : undefined;
    games.push({
      index: games.length,
      line: cur.line,
      text: cur.lines.join('\n'),
      lineMap: cur.map,
      movesFrom: cur.movesFrom < 0 ? cur.lines.length : cur.movesFrom,
      ...(syntax ? { syntax } : {}),
    });
    cur = undefined;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const n = i + 1;
    if (line.startsWith('%')) continue; // PGN escape lines
    const blank = BLANK.test(line);
    const header = HEADER.test(line);
    if (cur && header && cur.movesFrom >= 0 && (!cur.comment || prevBlank)) flush();
    else if (cur && !header && !blank && prevBlank && cur.movesFrom >= 0 && !cur.comment)
      if (endedWithResult || /^\s*1\.(?!\d)/.test(line)) flush();
    if (!cur) {
      if (blank) continue;
      cur = { line: n, lines: [], map: [], movesFrom: -1, parens: [] };
    }
    if (header && cur.movesFrom < 0) {
      cur.lines.push(line);
      cur.map.push(n);
    } else if (blank) {
      if (cur.comment) {
        cur.lines.push(line);
        cur.map.push(n);
      }
    } else {
      if (cur.movesFrom < 0) cur.movesFrom = cur.lines.length;
      scanBrackets(line, n, cur);
      endedWithResult = !cur.comment && RESULT_AT_END.test(line);
      cur.lines.push(line);
      cur.map.push(n);
    }
    prevBlank = blank;
  }
  flush();
  return games;
}

function scanBrackets(line: string, n: number, cur: { comment?: Pos; parens: Pos[] }) {
  for (let i = 0; i < line.length; i++) {
    if (cur.comment) {
      const close = line.indexOf('}', i);
      if (close < 0) return;
      cur.comment = undefined;
      i = close;
      continue;
    }
    const ch = line[i];
    if (ch === '{') cur.comment = { line: n, column: i + 1 };
    else if (ch === ';') return;
    else if (ch === '(') cur.parens.push({ line: n, column: i + 1 });
    else if (ch === ')') cur.parens.pop();
  }
}

// Same tokens as chessops' parser, so the n-th move token here is the n-th
// move node chessops created. Adapted from chessops src/pgn.ts (GPL-3.0+).
const TOKEN =
  /(?:[NBKRQ]?[a-h]?[1-8]?[-x]?[a-h][1-8](?:=?[nbrqkNBRQK])?|[pnbrqkPNBRQK]?@[a-h][1-8]|[O0o][-–—][O0o](?:[-–—][O0o])?)[+#]?|--|Z0|0000|@@@@|{|;|\$\d{1,4}|[?!]{1,2}|\(|\)|\*|1[-–—]0|0[-–—]1|1\/2[-–—]1\/2/g;
const NOT_A_MOVE = /^(?:\{|;|\$\d+|[?!]{1,2}|\(|\)|\*|1[-–—]0|0[-–—]1|1\/2[-–—]1\/2)$/;

function locateMove(raw: RawGame, n: number): Pos {
  const lines = raw.text.split('\n');
  let seen = -1;
  let inComment = false;
  for (let li = raw.movesFrom; li < lines.length; li++) {
    const line = lines[li]!;
    let i = 0;
    for (;;) {
      if (inComment) {
        const close = line.indexOf('}', i);
        if (close < 0) break;
        inComment = false;
        i = close + 1;
        continue;
      }
      TOKEN.lastIndex = i;
      const m = TOKEN.exec(line);
      if (!m) break;
      i = TOKEN.lastIndex;
      if (m[0] === '{') inComment = true;
      else if (m[0] === ';') break;
      else if (!NOT_A_MOVE.test(m[0]) && ++seen === n) return { line: raw.lineMap[li]!, column: m.index + 1 };
    }
  }
  return { line: raw.line, column: 1 };
}

function headerLine(raw: RawGame, name: string): number {
  const idx = raw.text.split('\n').findIndex((l) => l.trimStart().startsWith(`[${name} `));
  return idx >= 0 ? raw.lineMap[idx]! : raw.line;
}

// ---------- comments ----------

// `[%cm-*]` values can't contain `]` or `}`, so those (and `%`) are escaped.
const enc = (v: string) => v.replace(/%/g, '%25').replace(/\]/g, '%5D').replace(/\}/g, '%7D');
const dec = (v: string) => v.replace(/%5D/g, ']').replace(/%7D/g, '}').replace(/%25/g, '%');

type NodeExtras = Pick<TreeNode, 'comments' | 'shapes' | 'clock' | 'emt' | 'importedEval' | 'ext'>;

function readComments(raw: string[] | undefined): NodeExtras {
  const out: NodeExtras = { comments: [], shapes: [] };
  for (const c of raw ?? []) {
    const p = parseComment(c);
    for (const s of p.shapes) {
      out.shapes.push(
        s.from === s.to
          ? { orig: makeSquare(s.from), brush: s.color as Brush }
          : { orig: makeSquare(s.from), dest: makeSquare(s.to), brush: s.color as Brush },
      );
    }
    if (p.clock !== undefined) out.clock = p.clock;
    if (p.emt !== undefined) out.emt = p.emt;
    if (p.evaluation) {
      const ev = p.evaluation;
      out.importedEval = {
        score:
          'mate' in ev
            ? { kind: 'mate', value: ev.mate, pov: 'white' }
            : { kind: 'cp', value: Math.round(ev.pawns * 100), pov: 'white' },
        ...(ev.depth ? { depth: ev.depth } : {}),
        source: 'imported',
      };
    }
    let by: string | undefined;
    const text = p.text
      .replace(/\[%cm-([a-z][a-z0-9-]*)\s+([^\]]*)\]/g, (_m, key: string, value: string) => {
        if (key === 'by') by = dec(value.trim());
        else (out.ext ??= {})[key] = dec(value.trim());
        return ' ';
      })
      .trim();
    if (text) out.comments.push(by ? { text, by } : { text });
  }
  return out;
}

export type PgnOptions = { variations?: boolean; comments?: boolean; clocks?: boolean; extensions?: boolean };

function writeComments(node: TreeNode, o: Required<PgnOptions>): string[] | undefined {
  const cmd: Partial<Comment> = {};
  if (o.comments && node.shapes.length)
    cmd.shapes = node.shapes.map((s) => ({
      color: s.brush,
      from: parseSquare(s.orig),
      to: parseSquare(s.dest ?? s.orig),
    }));
  if (o.comments && node.importedEval) {
    const { score, depth } = node.importedEval;
    cmd.evaluation = score.kind === 'mate' ? { mate: score.value, depth } : { pawns: score.value / 100, depth };
  }
  if (o.clocks) {
    cmd.clock = node.clock;
    cmd.emt = node.emt;
  }
  const ext =
    o.extensions && node.ext
      ? Object.entries(node.ext)
          .map(([k, v]) => `[%cm-${k} ${enc(v)}]`)
          .join(' ')
      : '';
  const texts = o.comments
    ? node.comments.map((c: NodeComment) => (o.extensions && c.by ? `[%cm-by ${enc(c.by)}] ${c.text}` : c.text))
    : [];
  const first = makeComment({ ...cmd, text: [texts[0], ext].filter(Boolean).join(' ') || undefined });
  const out = [first, ...texts.slice(1)].filter(Boolean);
  return out.length ? out : undefined;
}

// ---------- reading ----------

const STANDARD = new Set(['standard', 'from position', 'normal', 'classical', 'chess']);

type Converted = { headers: Map<string, string>; cursor?: TreeCursor; error?: PgnError };

function convert(raw: RawGame, build: boolean): Converted {
  const fail = (code: PgnErrorCode, message: string, at: Pos = { line: raw.line, column: 1 }, extra = {}) => ({
    gameIndex: raw.index,
    line: at.line,
    column: at.column,
    code,
    message,
    ...extra,
  });
  const game: Game<PgnNodeData> = cParsePgn(raw.text, emptyHeaders)[0] ?? { headers: new Map(), moves: new Node() };
  const headers = game.headers;
  if (raw.syntax) return { headers, error: fail('PGN_SYNTAX', raw.syntax.message, raw.syntax) };

  const variant = headers.get('Variant');
  if (variant && !STANDARD.has(variant.trim().toLowerCase()))
    return {
      headers,
      error: fail('UNSUPPORTED_VARIANT', `This game is ${variant}. CheckMate supports standard chess only.`, {
        line: headerLine(raw, 'Variant'),
        column: 1,
      }),
    };

  let fen = INITIAL_FEN;
  const fenTag = headers.get('FEN');
  if (fenTag) {
    const at = { line: headerLine(raw, 'FEN'), column: 1 };
    const setup = parseSetup(fenTag);
    if (setup && looksLike960(setup))
      return {
        headers,
        error: fail('UNSUPPORTED_VARIANT', 'This game is Chess960. CheckMate supports standard chess only.', at),
      };
    const r = validateSetup(fenTag, { lenient: true });
    if (!r.ok) return { headers, error: fail('BAD_FEN_TAG', `The FEN tag is invalid: ${r.reasons[0]!.message}`, at) };
    fen = r.fen;
  }
  const startSetup = validateSetup(fen);
  if (!startSetup.ok) return { headers, error: fail('BAD_FEN_TAG', 'The FEN tag is invalid.') };
  const start = startSetup.pos;

  const root = build ? rootNode(start, fen) : undefined;
  if (root) Object.assign(root, readComments(game.comments));
  let moveIndex = -1;
  let count = 1;

  // One move: validate, then attach (merging a duplicate sibling).
  const step = (
    c: ChildNode<PgnNodeData>,
    pos: Chess,
    parent: TreeNode | undefined,
    ply: number,
  ): { pos: Chess; node?: TreeNode } | PgnError => {
    moveIndex++;
    const san = c.data.san;
    const label = `Move ${Math.ceil(ply / 2)}${ply % 2 ? '.' : '...'} ${san}`;
    const r = san === '--' ? { code: 'ILLEGAL_MOVE' as const, message: '' } : applySan(pos, san);
    if (isMoveError(r)) {
      const message =
        san === '--'
          ? `${label}: null moves aren't supported.`
          : r.code === 'AMBIGUOUS_MOVE'
            ? `${label} could be more than one move in this position.`
            : `${label} is illegal in this position.`;
      return fail(r.code, message, locateMove(raw, moveIndex), { ply, san });
    }
    if (++count > MAX_NODES)
      return fail('TOO_LARGE', `This game has more than ${MAX_NODES.toLocaleString('en')} moves and variations.`);
    if (!parent) return { pos: r.pos };
    const extras = readComments(c.data.comments);
    const existing = parent.children.find((n) => n.id === r.id);
    if (existing) {
      count--;
      existing.comments.push(...extras.comments);
      existing.nags = [...new Set([...existing.nags, ...(c.data.nags ?? [])])];
      existing.shapes.push(...extras.shapes);
      existing.startingComments.push(...(c.data.startingComments ?? []));
      return { pos: r.pos, node: existing };
    }
    const node: TreeNode = {
      ...childNode(parent, r),
      ...extras,
      nags: [...new Set(c.data.nags ?? [])],
      startingComments: (c.data.startingComments ?? []).map((s) => s.trim()).filter(Boolean),
    };
    parent.children.push(node);
    return { pos: r.pos, node };
  };

  // Walks in PGN text order (a move, its sibling variations, then onward), so
  // `moveIndex` matches the order chessops created the nodes in.
  const line = (
    children: ChildNode<PgnNodeData>[],
    pos: Chess,
    parent: TreeNode | undefined,
    ply: number,
  ): PgnError | undefined => {
    while (children.length) {
      const [main, ...variations] = children;
      const m = step(main!, pos, parent, ply);
      if ('code' in m) return m;
      for (const v of variations) {
        const s = step(v, pos, parent, ply);
        if ('code' in s) return s;
        const e = line(v.children, s.pos, s.node, ply + 1);
        if (e) return e;
      }
      children = main!.children;
      pos = m.pos;
      parent = m.node;
      ply++;
    }
    return undefined;
  };

  const error = line(game.moves.children, start, root, initialPly(fen) + 1);
  if (error) return { headers, error };
  return root ? { headers, cursor: new TreeCursor(root, headers, count) } : { headers };
}

export type GameSummary = { index: number; line: number; headers: [string, string][]; error?: PgnError };

const fileError = (code: PgnErrorCode, message: string): PgnError => ({
  gameIndex: 0,
  line: 1,
  column: 1,
  code,
  message,
});

// The game list for a paste or file (P1-PG-02). Every game is validated,
// one at a time, and only its headers are kept.
export function indexPgn(text: string): { games: GameSummary[]; error?: PgnError } {
  if (text.length > MAX_PGN_CHARS)
    return { games: [], error: fileError('TOO_LARGE', 'This PGN is over 10 MB, too big to open here.') };
  const raws = splitGames(text);
  if (!raws.length) return { games: [], error: fileError('PGN_SYNTAX', 'No games found in this PGN.') };
  if (raws.length > MAX_GAMES)
    return {
      games: [],
      error: fileError('TOO_LARGE', `This PGN has ${raws.length.toLocaleString('en')} games; the limit here is 5,000.`),
    };
  return {
    games: raws.map((raw) => {
      const { headers, error } = convert(raw, false);
      return { index: raw.index, line: raw.line, headers: [...headers], ...(error ? { error } : {}) };
    }),
  };
}

export function loadGame(text: string, index = 0): { ok: true; cursor: TreeCursor } | { ok: false; error: PgnError } {
  if (text.length > MAX_PGN_CHARS) return { ok: false, error: fileError('TOO_LARGE', 'This PGN is over 10 MB.') };
  const raw = splitGames(text)[index];
  if (!raw) return { ok: false, error: fileError('PGN_SYNTAX', 'No game found in this PGN.') };
  const { cursor, error } = convert(raw, true);
  return cursor ? { ok: true, cursor } : { ok: false, error: error! };
}

// ---------- writing ----------

// P1-PG-20/23. Headers are written as stored; a non-standard start always
// carries its FEN.
export function makePgn(tree: Pick<TreeCursor, 'root' | 'headers'>, opts: PgnOptions = {}): string {
  const o: Required<PgnOptions> = { variations: true, comments: true, clocks: true, extensions: false, ...opts };
  const headers = new Map(tree.headers);
  if (tree.root.fen !== INITIAL_FEN && !headers.has('FEN')) {
    headers.set('SetUp', '1');
    headers.set('FEN', tree.root.fen);
  }
  const rootComments = writeComments(tree.root, o);
  const game: Game<PgnNodeData> = { headers, ...(rootComments ? { comments: rootComments } : {}), moves: new Node() };
  // Iterative: a mainline can be thousands of moves deep.
  const stack: [TreeNode, Node<PgnNodeData>][] = [[tree.root, game.moves]];
  while (stack.length) {
    const [node, out] = stack.pop()!;
    for (const child of o.variations ? node.children : node.children.slice(0, 1)) {
      const comments = writeComments(child, o);
      const next = new ChildNode<PgnNodeData>({
        san: child.san,
        // Only a variation's first move can carry comments before it in PGN.
        ...(o.comments && child.startingComments.length && child !== node.children[0]
          ? { startingComments: child.startingComments }
          : {}),
        ...(comments ? { comments } : {}),
        ...(child.nags.length ? { nags: child.nags } : {}),
      });
      out.children.push(next);
      stack.push([child, next]);
    }
  }
  return cMakePgn(game);
}
