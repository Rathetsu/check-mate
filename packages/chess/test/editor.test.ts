// Board editor logic (P1-ED-03..09): castling and en passant availability for
// 20 setups, the FEN it writes, and swap colors.
import { describe, expect, test } from 'vitest';
import {
  castlingAvailability,
  EMPTY_BOARD,
  placePiece,
  editorFen,
  editorState,
  epCandidates,
  INITIAL_FEN,
  swapColors,
  validateSetup,
  type EditorState,
} from '../src/index.ts';

const ALL = { K: true, Q: true, k: true, q: true };
const NONE = { K: false, Q: false, k: false, q: false };

// [placement, turn, castling available (KQkq as letters), en passant candidates]
const SETUPS: [string, 'white' | 'black', string, string[]][] = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', 'white', 'KQkq', []],
  ['r3k2r/8/8/8/8/8/8/R3K2R', 'white', 'KQkq', []],
  ['r3k2r/8/8/8/8/8/8/R4K1R', 'white', 'kq', []], // white king moved off e1
  ['r3k2r/8/8/8/8/8/8/R3K3', 'white', 'Qkq', []], // h1 rook gone
  ['r3k2r/8/8/8/8/8/8/4K2R', 'white', 'Kkq', []], // a1 rook gone
  ['4k3/8/8/8/8/8/8/R3K2R', 'white', 'KQ', []], // black has no rooks
  ['r3k2r/8/8/8/8/8/8/r3K2R', 'white', 'Kkq', []], // a black rook in white's corner
  ['r2k3r/8/8/8/8/8/8/R3K2R', 'black', 'KQ', []], // black king on d8
  ['1r2k2r/8/8/8/8/8/8/R3K2R', 'black', 'KQk', []], // b8 is not a corner
  ['4k3/8/8/8/8/8/8/4K3', 'white', '', []],
  // En passant: a double push just happened next to an enemy pawn.
  ['4k3/8/8/3pP3/8/8/8/4K3', 'white', '', ['d6']],
  ['4k3/8/8/4Pp2/8/8/8/4K3', 'white', '', ['f6']],
  ['4k3/8/8/2pPp3/8/8/8/4K3', 'white', '', ['c6', 'e6']],
  ['4k3/8/8/3pP3/8/8/8/4K3', 'black', '', []], // wrong side to move
  ['4k3/8/3p4/3pP3/8/8/8/4K3', 'white', '', []], // d6 is blocked
  ['4k3/3p4/8/3pP3/8/8/8/4K3', 'white', '', []], // d7 is occupied: no double push
  ['4k3/8/8/8/3Pp3/8/8/4K3', 'black', '', ['d3']],
  ['4k3/8/8/8/2PpP3/8/8/4K3', 'black', '', ['c3', 'e3']],
  ['4k3/8/8/8/3Pp3/3P4/8/4K3', 'black', '', []], // d3 is blocked
  ['4k3/8/8/p6P/8/8/8/4K3', 'white', '', []], // not adjacent across the board edge
];

describe('availability (P1-ED-05, P1-ED-06)', () => {
  test.each(SETUPS)('%s %s', (placement, turn, castling, ep) => {
    const avail = castlingAvailability(placement);
    expect(
      Object.entries(avail)
        .filter(([, on]) => on)
        .map(([t]) => t)
        .join(''),
    ).toBe(castling);
    expect(epCandidates(placement, turn)).toEqual(ep);
  });
});

const state = (fen: string): EditorState => {
  const r = editorState(fen);
  if (!r.ok) throw new Error(r.message);
  return r.state;
};

describe('editorFen', () => {
  test('round-trips the starting position', () => {
    expect(editorFen(state(INITIAL_FEN))).toBe(INITIAL_FEN);
  });

  test('drops rights and en passant squares the board no longer allows', () => {
    const s = { ...state(INITIAL_FEN), board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN1', ep: 'e3' as const };
    expect(editorFen(s)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN1 w Qkq - 0 1');
    expect(editorFen({ ...s, castling: NONE })).toContain(' w - - ');
  });

  test('keeps a candidate en passant square, and the result validates', () => {
    const s: EditorState = {
      board: '4k3/8/8/3pP3/8/8/8/4K3',
      turn: 'white',
      castling: ALL,
      ep: 'd6',
      halfmoves: 0,
      fullmoves: 9,
    };
    const fen = editorFen(s);
    expect(fen).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 9');
    expect(validateSetup(fen).ok).toBe(true);
  });

  test('counters are clamped to their ranges (P1-ED-07)', () => {
    const s = { ...state(INITIAL_FEN), halfmoves: 400, fullmoves: 0 };
    expect(editorFen(s)).toMatch(/ 150 1$/);
  });

  test('loads invalid but parseable FENs, refuses junk and Chess960', () => {
    expect(editorState('P3k3/8/8/8/8/8/8/4K3 w - - 0 1').ok).toBe(true);
    expect(editorState('not a fen')).toEqual({ ok: false, message: "This isn't a valid FEN." });
    expect(editorState('rk6/8/8/8/8/8/8/RK6 w Aa - 0 1').ok).toBe(false);
  });
});

describe('swapColors (P1-ED-03)', () => {
  test('mirrors pieces, colors, side to move, castling and en passant', () => {
    const s: EditorState = {
      board: 'r3k3/8/8/3pP3/8/8/8/4K2R',
      turn: 'white',
      castling: { K: true, Q: false, k: false, q: true },
      ep: 'd6',
      halfmoves: 3,
      fullmoves: 20,
    };
    const swapped = swapColors(s);
    expect(swapped).toEqual({
      board: '4k2r/8/8/8/3Pp3/8/8/R3K3',
      turn: 'black',
      castling: { K: false, Q: true, k: true, q: false },
      ep: 'd3',
      halfmoves: 3,
      fullmoves: 20,
    });
    expect(epCandidates(swapped.board, swapped.turn)).toContain('d3');
    expect(swapColors(swapped)).toEqual(s);
  });

  test('the starting position swaps to itself with black to move', () => {
    expect(editorFen(swapColors(state(INITIAL_FEN)))).toBe(INITIAL_FEN.replace(' w ', ' b '));
  });
});

test('placePiece puts and clears pieces (P1-ED-02)', () => {
  const placed = placePiece(EMPTY_BOARD, 'e4', { role: 'queen', color: 'black' });
  expect(placed).toBe('8/8/8/8/4q3/8/8/8');
  expect(placePiece(placed, 'e4', null)).toBe(EMPTY_BOARD);
});
