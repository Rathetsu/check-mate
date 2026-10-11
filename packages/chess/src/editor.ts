// Board editor state (P1-ED-04..09). Castling availability and en passant
// candidates are adapted from lila ui/editor/src/ctrl.ts
// (computeCastlingToggles, getEnPassantOptions) at commit
// 46d24871f68844ec1df18ab8618b5156ffbe4e56 (AGPL-3.0-or-later,
// lichess-org/lila), rewritten over chessops boards. Whether a position is
// valid is still decided only by `validateSetup`.
import { Board } from 'chessops/board';
import { makeBoardFen, makeFen as cMakeFen, parseBoardFen } from 'chessops/fen';
import { SquareSet } from 'chessops/squareSet';
import type { Color, Role, Square, SquareName } from 'chessops/types';
import { makeSquare, opposite, parseSquare, squareFile } from 'chessops/util';
import { INITIAL_FEN, looksLike960, parseSetup } from './fen.ts';

export type CastlingToggle = 'K' | 'Q' | 'k' | 'q';
export const CASTLING_TOGGLES: CastlingToggle[] = ['K', 'Q', 'k', 'q'];
const ROOK_OF: Record<CastlingToggle, Square> = { K: 7, Q: 0, k: 63, q: 56 }; // h1 a1 h8 a8
const KING_OF: Record<CastlingToggle, { sq: Square; color: Color }> = {
  K: { sq: 4, color: 'white' },
  Q: { sq: 4, color: 'white' },
  k: { sq: 60, color: 'black' },
  q: { sq: 60, color: 'black' },
};

export type EditorState = {
  board: string; // the placement field of a FEN
  turn: Color;
  castling: Record<CastlingToggle, boolean>; // what the user asked for
  ep: SquareName | null;
  halfmoves: number;
  fullmoves: number;
};

const board = (placement: string): Board =>
  parseBoardFen(placement).unwrap(
    (b) => b,
    () => Board.empty(),
  );

// P1-ED-05: a right is available only while the king and that rook stand on
// their home squares.
export function castlingAvailability(placement: string): Record<CastlingToggle, boolean> {
  const b = board(placement);
  const at = (sq: Square, role: 'king' | 'rook', color: Color) => {
    const p = b.get(sq);
    return p?.role === role && p.color === color;
  };
  const out = {} as Record<CastlingToggle, boolean>;
  for (const t of CASTLING_TOGGLES)
    out[t] = at(KING_OF[t].sq, 'king', KING_OF[t].color) && at(ROOK_OF[t], 'rook', KING_OF[t].color);
  return out;
}

// P1-ED-06: squares where the side to move could capture en passant, given
// the board alone: an enemy pawn that could just have advanced two squares
// (both squares behind it empty) next to one of ours.
export function epCandidates(placement: string, turn: Color): SquareName[] {
  const b = board(placement);
  const them = opposite(turn);
  const rank = turn === 'white' ? 4 : 3; // where their pawn now stands (5th or 4th rank)
  const dir = turn === 'white' ? 8 : -8;
  const out: SquareName[] = [];
  for (const sq of b.pieces(them, 'pawn').intersect(SquareSet.fromRank(rank))) {
    const passed = sq + dir; // the square it skipped: the ep square
    if (b.get(passed) || b.get(passed + dir)) continue;
    const file = squareFile(sq);
    const ours = b.pieces(turn, 'pawn');
    if ((file > 0 && ours.has(sq - 1)) || (file < 7 && ours.has(sq + 1))) out.push(makeSquare(passed));
  }
  return out.sort();
}

// The FEN for the editor state. Rights that aren't available and an en
// passant square that isn't a candidate are left out, as lila does.
export function editorFen(s: EditorState): string {
  const b = board(s.board);
  const available = castlingAvailability(s.board);
  let castlingRights = SquareSet.empty();
  for (const t of CASTLING_TOGGLES) if (s.castling[t] && available[t]) castlingRights = castlingRights.with(ROOK_OF[t]);
  const ep = s.ep && epCandidates(s.board, s.turn).includes(s.ep) ? parseSquare(s.ep) : undefined;
  return cMakeFen({
    board: b,
    pockets: undefined,
    turn: s.turn,
    castlingRights,
    epSquare: ep,
    remainingChecks: undefined,
    halfmoves: Math.max(0, Math.min(150, Math.trunc(s.halfmoves) || 0)),
    fullmoves: Math.max(1, Math.trunc(s.fullmoves) || 1),
  });
}

export type EditorParse = { ok: true; state: EditorState } | { ok: false; message: string };

// P1-ED-08: any parseable standard FEN loads, valid or not, so the user can
// fix it here. Chess960 castling can't be expressed in this editor.
export function editorState(fen: string = INITIAL_FEN): EditorParse {
  const setup = parseSetup(fen);
  if (!setup) return { ok: false, message: "This isn't a valid FEN." };
  if (looksLike960(setup)) return { ok: false, message: 'Chess960 positions are not supported.' };
  const castling = {} as Record<CastlingToggle, boolean>;
  for (const t of CASTLING_TOGGLES) castling[t] = setup.castlingRights.has(ROOK_OF[t]);
  return {
    ok: true,
    state: {
      board: makeBoardFen(setup.board),
      turn: setup.turn,
      castling,
      ep: setup.epSquare === undefined ? null : makeSquare(setup.epSquare),
      halfmoves: setup.halfmoves,
      fullmoves: setup.fullmoves,
    },
  };
}

// P1-ED-03: mirror top to bottom, swap every piece's color, flip the side to
// move, and mirror castling rights and the en passant square with them.
export function swapColors(s: EditorState): EditorState {
  const from = board(s.board);
  const to = Board.empty();
  for (const sq of from.occupied) {
    const p = from.get(sq)!;
    to.set(sq ^ 56, { ...p, color: opposite(p.color) });
  }
  const ep = s.ep ? parseSquare(s.ep) : undefined;
  return {
    ...s,
    board: makeBoardFen(to),
    turn: opposite(s.turn),
    castling: { K: s.castling.k, Q: s.castling.q, k: s.castling.K, q: s.castling.Q },
    ep: ep === undefined ? null : makeSquare(ep ^ 56),
  };
}

export const EMPTY_BOARD = '8/8/8/8/8/8/8/8';

// P1-ED-02: the sticky-piece and eraser tools. `null` clears the square.
export function placePiece(placement: string, square: SquareName, piece: { role: Role; color: Color } | null): string {
  const b = board(placement);
  const sq = parseSquare(square);
  if (sq === undefined) return placement;
  if (piece) b.set(sq, piece);
  else b.take(sq);
  return makeBoardFen(b);
}
