// FEN validation (P1-PG-10..12), moves, game status and positionKey (CORE-11).
import { describe, expect, test } from 'vitest';
import {
  applySan,
  boardSquares,
  applyUci,
  fenFromUrl,
  fenToUrl,
  gameStatus,
  INITIAL_FEN,
  isMoveError,
  positionKey,
  TreeCursor,
  validateSetup,
  type Played,
} from '../src/index.ts';

const pos = (fen: string) => {
  const r = validateSetup(fen);
  if (!r.ok) throw new Error(r.reasons.map((x) => x.code).join());
  return r.pos;
};
const codes = (fen: string) => {
  const r = validateSetup(fen);
  return r.ok ? [] : r.reasons.map((x) => x.code);
};

describe('validateSetup', () => {
  test.each([
    ['8/8/8/8/8/8/8/8 w - - 0 1', ['EMPTY']],
    ['8/8/8/8/8/8/8/4K3 w - - 0 1', ['KINGS']],
    ['4k3/8/8/8/8/8/8/4KK2 w - - 0 1', ['KINGS']],
    ['4k3/8/8/8/8/8/8/4R1K1 w - - 0 1', ['OPPOSITE_CHECK']],
    ['P3k3/8/8/8/8/8/8/4K3 w - - 0 1', ['PAWNS_ON_BACKRANK']],
    ['4k3/pppppppp/p7/8/8/8/8/4K3 w - - 0 1', ['TOO_MANY_PIECES']],
    ['4k3/8/8/8/8/8/8/4K3 w KQ - 0 1', ['BAD_CASTLING']],
    ['4k3/8/8/8/8/8/8/4K2R w KQ - 0 1', ['BAD_CASTLING']],
    ['4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1', []],
    ['4k3/8/8/8/8/8/8/4K3 b - e3 0 1', ['BAD_EP']],
    ['not a fen', ['BAD_FEN']],
    // Every reason is listed, not just the first (P1-ED-09).
    ['P3k3/8/8/8/8/8/8/4K3 w Q e6 0 1', ['PAWNS_ON_BACKRANK', 'BAD_CASTLING', 'BAD_EP']],
  ])('%s → %j', (fen, expected) => {
    expect(codes(fen)).toEqual(expected);
  });

  test('accepts 4-, 5- and 6-field FENs and writes 6 (P1-PG-11)', () => {
    for (const fen of [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0',
      INITIAL_FEN,
    ]) {
      const r = validateSetup(fen);
      expect(r.ok && r.fen).toBe(INITIAL_FEN);
    }
  });

  test('lenient mode drops impossible castling and en passant (PGN [FEN] tags)', () => {
    const r = validateSetup('4k3/8/8/8/8/8/8/4K3 w KQkq e6 0 1', { lenient: true });
    expect(r.ok && r.fen).toBe('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  });

  test('URL FENs use _ for spaces (P1-PG-12)', () => {
    expect(fenToUrl(INITIAL_FEN)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1');
    expect(fenFromUrl(fenToUrl(INITIAL_FEN))).toBe(INITIAL_FEN);
    expect(fenFromUrl('bad%E0%A4%A')).toBe('bad%E0%A4%A'); // never throws
  });
});

describe('moves', () => {
  test('castling gets standard UCI and one id however it is spelled', () => {
    const p = pos('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const a = applyUci(p, 'e1g1')!;
    const b = applyUci(p, 'e1h1')!;
    const c = applySan(p, '0-0') as Played;
    expect([a.uci, b.uci, c.uci]).toEqual(['e1g1', 'e1g1', 'e1g1']);
    expect(new Set([a.id, b.id, c.id]).size).toBe(1);
    expect(a.san).toBe('O-O');
  });

  test('applySan tells ambiguous from illegal', () => {
    const p = pos('4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1');
    const amb = applySan(p, 'Nd2');
    expect(isMoveError(amb) && amb.code).toBe('AMBIGUOUS_MOVE');
    const ill = applySan(p, 'Nd5');
    expect(isMoveError(ill) && ill.code).toBe('ILLEGAL_MOVE');
    expect(isMoveError(applySan(p, 'Nbd2'))).toBe(false);
  });

  test('promotion with and without =', () => {
    const p = pos('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    expect((applySan(p, 'a8Q') as Played).san).toBe('a8=Q');
    expect((applySan(p, 'a8=N') as Played).uci).toBe('a7a8n');
  });

  test('applyUci refuses illegal moves', () => {
    expect(applyUci(pos(INITIAL_FEN), 'e2e5')).toBeUndefined();
    expect(applyUci(pos(INITIAL_FEN), 'zz')).toBeUndefined();
  });
});

describe('gameStatus (P1-AN-06)', () => {
  test.each([
    ['rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', 'checkmate'],
    ['7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 'stalemate'],
    ['8/8/4k3/8/8/2B5/8/4K3 w - - 0 1', 'insufficient'],
    ['4k3/8/8/8/8/8/8/R3K3 w - - 100 80', 'fifty'],
    [INITIAL_FEN, 'ongoing'],
  ])('%s → %s', (fen, status) => {
    expect(gameStatus(pos(fen))).toBe(status);
  });

  test('threefold from the path keys', () => {
    const t = TreeCursor.fromFen();
    for (const m of ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']) t.play(m);
    const keys = t.nodesAlong().map((n) => n.positionKey);
    expect(gameStatus(pos(t.node.fen), keys)).toBe('threefold');
    expect(gameStatus(pos(t.node.fen), keys.slice(0, -4))).toBe('ongoing');
  });
});

describe('positionKey (CORE-11)', () => {
  test('keeps en passant only when a capture is legal', () => {
    const noCapture = pos('rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 2');
    expect(positionKey(noCapture)).toBe('rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    const capture = pos('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3');
    expect(positionKey(capture)).toBe('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6');
  });

  test('ignores move counters and tracks castling rights', () => {
    const a = pos('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const b = pos('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 12 40');
    const c = pos('r3k2r/8/8/8/8/8/8/R3K2R w Kkq - 0 1');
    expect(positionKey(a)).toBe(positionKey(b));
    expect(positionKey(a)).not.toBe(positionKey(c));
  });

  test('a promoted piece is written without ~ in standard chess', () => {
    const p = applyUci(pos('8/P6k/8/8/8/8/8/K7 w - - 0 1'), 'a7a8q')!;
    expect(positionKey(p.pos)).toBe('Q7/7k/8/8/8/8/8/K7 b - -');
  });
});

test('boardSquares lists a8 to h1', () => {
  const sq = boardSquares(INITIAL_FEN);
  expect(sq).toHaveLength(64);
  expect(sq[0]).toEqual({ role: 'rook', color: 'black' });
  expect(sq[60]).toEqual({ role: 'king', color: 'white' });
  expect(sq[27]).toBeNull();
  expect(boardSquares('junk').every((s) => s === null)).toBe(true);
});
