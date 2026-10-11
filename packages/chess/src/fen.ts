// FEN parsing and setup validation (P1-PG-10..12). chessops decides
// everything; this file only collects every reason instead of the first one,
// and limits castling to standard chess (CORE-70).
import { Chess } from 'chessops/chess';
import { INITIAL_FEN, makeFen as cMakeFen, parseFen as cParseFen } from 'chessops/fen';
import type { Setup } from 'chessops/setup';
import { SquareSet } from 'chessops/squareSet';
import type { Color } from 'chessops/types';
import { opposite } from 'chessops/util';

export { INITIAL_FEN };

export type SetupReasonCode =
  | 'BAD_FEN'
  | 'EMPTY'
  | 'KINGS'
  | 'OPPOSITE_CHECK'
  | 'PAWNS_ON_BACKRANK'
  | 'TOO_MANY_PIECES'
  | 'BAD_CASTLING'
  | 'BAD_EP';
export type SetupReason = { code: SetupReasonCode; message: string };
export type SetupResult = { ok: true; pos: Chess; fen: string } | { ok: false; reasons: SetupReason[] };

const KING_HOME = { white: 4, black: 60 } as const; // e1, e8
const ROOK_HOMES = { white: [0, 7], black: [56, 63] } as const; // a1 h1, a8 h8
const NAME = { white: 'White', black: 'Black' } as const;

// Castling rights that standard chess allows for this placement: the king on
// its home square and a rook of its color in the corner.
export function standardCastling(setup: Pick<Setup, 'board' | 'castlingRights'>): SquareSet {
  let rights = SquareSet.empty();
  for (const color of ['white', 'black'] as const) {
    if (setup.board.kingOf(color) !== KING_HOME[color]) continue;
    for (const sq of ROOK_HOMES[color]) {
      const piece = setup.board.get(sq);
      if (setup.castlingRights.has(sq) && piece?.role === 'rook' && piece.color === color) rights = rights.with(sq);
    }
  }
  return rights;
}

// chessops validates only the first problem. Setting up without validation
// lets each check below run on its own.
function unchecked(setup: Setup): Chess {
  const pos = Chess.default();
  (pos as unknown as { setupUnchecked(s: Setup): void }).setupUnchecked(setup);
  return pos;
}

// Castling rights a standard game can't have: a right off the corners, or
// rights for a king that isn't on its home square. That's Chess960 (CORE-70).
export function looksLike960(setup: Pick<Setup, 'board' | 'castlingRights'>): boolean {
  if (setup.castlingRights.diff(SquareSet.corners()).nonEmpty()) return true;
  return (['white', 'black'] as const).some(
    (c) => setup.castlingRights.intersects(SquareSet.backrank(c)) && setup.board.kingOf(c) !== KING_HOME[c],
  );
}

export function parseSetup(fen: string): Setup | undefined {
  return cParseFen(fen.trim()).unwrap(
    (s) => s,
    () => undefined,
  );
}

// `lenient` (PGN [FEN] tags): impossible castling rights and en passant
// squares are dropped silently, as chessops does, instead of reported.
export function validateSetup(fen: string, opts: { lenient?: boolean } = {}): SetupResult {
  const parsed = parseSetup(fen);
  const setup = parsed && opts.lenient ? { ...parsed, castlingRights: standardCastling(parsed) } : parsed;
  if (!setup) return { ok: false, reasons: [{ code: 'BAD_FEN', message: "This isn't a valid FEN." }] };

  const reasons: SetupReason[] = [];
  const { board } = setup;
  if (board.occupied.isEmpty()) return { ok: false, reasons: [{ code: 'EMPTY', message: 'The board is empty.' }] };

  const kingsOk = (['white', 'black'] as const).every((c) => board.pieces(c, 'king').size() === 1);
  if (!kingsOk) reasons.push({ code: 'KINGS', message: 'Each side needs exactly one king.' });

  const pos = unchecked(setup);
  const otherKing = board.kingOf(opposite(setup.turn));
  if (kingsOk && otherKing !== undefined && pos.kingAttackers(otherKing, setup.turn, board.occupied).nonEmpty())
    reasons.push({
      code: 'OPPOSITE_CHECK',
      message: `${NAME[opposite(setup.turn)]} is in check but it isn't their move.`,
    });

  if (SquareSet.backranks().intersects(board.pawn))
    reasons.push({ code: 'PAWNS_ON_BACKRANK', message: "Pawns can't stand on the first or last rank." });

  for (const color of ['white', 'black'] as Color[]) {
    if (board[color].size() > 16 || board.pieces(color, 'pawn').size() > 8)
      reasons.push({ code: 'TOO_MANY_PIECES', message: `${NAME[color]} has too many pieces.` });
  }

  if (!setup.castlingRights.equals(standardCastling(setup)))
    reasons.push({ code: 'BAD_CASTLING', message: "Castling rights don't match where the kings and rooks stand." });

  if (setup.epSquare !== undefined && pos.epSquare !== setup.epSquare && !opts.lenient)
    reasons.push({ code: 'BAD_EP', message: "That en passant square isn't possible in this position." });

  if (reasons.length) return { ok: false, reasons };
  const valid = Chess.fromSetup({ ...setup, castlingRights: standardCastling(setup) }).unwrap(
    (p) => p,
    () => undefined,
  );
  // Unreachable while the checks above mirror chessops', kept as a guard.
  if (!valid) return { ok: false, reasons: [{ code: 'BAD_FEN', message: "This position isn't legal." }] };
  return { ok: true, pos: valid, fen: makeFen(valid) };
}

// Always six fields (P1-PG-11).
export const makeFen = (pos: Chess): string => cMakeFen(pos.toSetup());

// Lichess-style URL FENs use `_` for spaces (P1-PG-12).
export const fenToUrl = (fen: string): string => fen.trim().replace(/ /g, '_');
export function fenFromUrl(segment: string): string {
  try {
    return decodeURIComponent(segment).replace(/_/g, ' ');
  } catch {
    return segment.replace(/_/g, ' '); // a stray % in a hand-typed URL
  }
}

export function initialPly(fen: string): number {
  const setup = parseSetup(fen);
  return setup ? (setup.fullmoves - 1) * 2 + (setup.turn === 'black' ? 1 : 0) : 0;
}

// The 64 squares from a8 to h1, row by row: what a static board picture draws.
export function boardSquares(fen: string): ({ role: string; color: 'white' | 'black' } | null)[] {
  const setup = parseSetup(fen);
  const out: ({ role: string; color: 'white' | 'black' } | null)[] = [];
  for (let rank = 7; rank >= 0; rank--)
    for (let file = 0; file < 8; file++) {
      const p = setup?.board.get(rank * 8 + file);
      out.push(p ? { role: p.role, color: p.color } : null);
    }
  return out;
}
