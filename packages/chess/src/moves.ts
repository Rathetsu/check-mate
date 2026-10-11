// Moves through chessops only (ADR 2026-10-10-07). Castling is king→rook
// inside chessops; `uci` here is always standard notation (e1g1).
import { castlingSide, normalizeMove, type Chess } from 'chessops/chess';
import { chessgroundDests, scalachessCharPair } from 'chessops/compat';
import { makeSanAndPlay, parseSan } from 'chessops/san';
import type { Move, NormalMove, SquareName } from 'chessops/types';
import { charToRole, kingCastlesTo, makeUci, parseSquare, parseUci, squareFile, squareRank } from 'chessops/util';
import { positionKey } from './keys.ts';

export type Played = { pos: Chess; id: string; uci: string; san: string };
export type MoveError = { code: 'ILLEGAL_MOVE' | 'AMBIGUOUS_MOVE'; message: string };

export const legalDests = (pos: Chess): Map<SquareName, SquareName[]> => chessgroundDests(pos);

// Plays a legal move on a copy. `id` is lila's 2-character node id, computed
// after normalizing so every spelling of a castle gets the same id.
export function play(pos: Chess, move: Move): Played {
  const next = pos.clone();
  const norm = normalizeMove(pos, move) as NormalMove;
  const side = castlingSide(pos, norm);
  const uci = makeUci(side ? { from: norm.from, to: kingCastlesTo(pos.turn, side) } : norm);
  return { pos: next, id: scalachessCharPair(norm), uci, san: makeSanAndPlay(next, norm) };
}

export function applyUci(pos: Chess, uci: string): Played | undefined {
  const move = parseUci(uci);
  if (!move || !('from' in move) || !pos.isLegal(move)) return;
  return play(pos, move);
}

const SAN_SHAPE = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?[NBRQnbrq])?[+#]?$/;

export function applySan(pos: Chess, san: string): Played | MoveError {
  const text = san
    .trim()
    .replace(/[!?]+$/, '')
    .replace(/^[0o]-[0o]-[0o]/i, 'O-O-O')
    .replace(/^[0o]-[0o]/i, 'O-O');
  const move = parseSan(pos, text);
  if (move) return play(pos, move);
  // chessops answers `undefined` for both; count the matching legal moves.
  const m = SAN_SHAPE.exec(text);
  if (m) {
    const role = m[1] ? charToRole(m[1]) : 'pawn';
    const to = parseSquare(m[4]!)!;
    let candidates = 0;
    for (const [from, dests] of pos.allDests()) {
      if (pos.board.getRole(from) !== role || !dests.has(to)) continue;
      if (m[2] && squareFile(from) !== m[2].charCodeAt(0) - 97) continue;
      if (m[3] && squareRank(from) !== Number(m[3]) - 1) continue;
      candidates++;
    }
    if (candidates > 1) return { code: 'AMBIGUOUS_MOVE', message: `${san} could be more than one move here.` };
  }
  return { code: 'ILLEGAL_MOVE', message: `${san} is illegal in this position.` };
}

export const isMoveError = (r: Played | MoveError): r is MoveError => 'code' in r;

export type GameStatus = 'checkmate' | 'stalemate' | 'insufficient' | 'threefold' | 'fifty' | 'ongoing';

// `keys` are the position keys from the root to this position, inclusive.
export function gameStatus(pos: Chess, keys: string[] = [positionKey(pos)]): GameStatus {
  if (pos.isCheckmate()) return 'checkmate';
  if (pos.isStalemate()) return 'stalemate';
  if (pos.isInsufficientMaterial()) return 'insufficient';
  const last = keys[keys.length - 1];
  if (keys.filter((k) => k === last).length >= 3) return 'threefold';
  if (pos.halfmoves >= 100) return 'fifty';
  return 'ongoing';
}

// A UCI line (an engine PV) as SAN, stopping at the first illegal move.
export function sanLine(pos: Chess, uci: string[]): string[] {
  const out: string[] = [];
  for (const m of uci) {
    const played = applyUci(pos, m);
    if (!played) break;
    out.push(played.san);
    pos = played.pos;
  }
  return out;
}
