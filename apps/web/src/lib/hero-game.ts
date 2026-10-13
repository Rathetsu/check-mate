// Home page data (home-motion spec): the hero replays Morphy's Opera Game
// through the rules layer, one frame per position, and the ticker names
// famous openings from the openings table. Server-only, so chessops stays
// off the client.
import {
  boardSquares,
  classifyLine,
  fenToUrl,
  gameStatus,
  loadGame,
  positionOf,
  squareControl,
  type OpeningTable,
} from '@checkmate/chess';

// Paris 1858, from the game record (public domain). loadGame rejects an
// illegal move, so a typo here throws instead of showing a wrong game.
const OPERA_GAME = `[White "Paul Morphy"]
[Black "Duke Karl of Brunswick and Count Isouard"]
[Site "Paris"]
[Date "1858.??.??"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

export type HeroFrame = {
  board: string; // 64 chars, a8 to h1 like boardSquares: FEN letters, '.' for empty
  control: number[]; // squareControl
  move: string | null; // "13. Rxd7"
  changed: number[]; // squares whose contents changed: the last-move highlight
  slides: [from: number, to: number][]; // pieces to animate into place
  opening: string | null;
  beat: boolean; // the layers part on this move
  mated: number | null; // the mated king's square, on the final frame
};

const LETTER: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

const encode = (fen: string): string =>
  boardSquares(fen)
    .map((p) => (!p ? '.' : p.color === 'white' ? LETTER[p.role]!.toUpperCase() : LETTER[p.role]!))
    .join('');

// Pairs each arriving piece with a square the same piece just left. Covers
// castling (two pieces), captures and en passant; a promotion just appears.
export function slidesBetween(prev: string, next: string): [number, number][] {
  const vacated = [...prev].flatMap((p, i) => (p !== '.' && next[i] === '.' ? [i] : []));
  const out: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    if (next[i] === '.' || next[i] === prev[i]) continue;
    const k = vacated.findIndex((v) => prev[v] === next[i]);
    if (k >= 0) out.push([vacated.splice(k, 1)[0]!, i]);
  }
  return out;
}

export function heroFrames(openings: OpeningTable): HeroFrame[] {
  const game = loadGame(OPERA_GAME);
  if (!game.ok) throw new Error(`Hero game: ${game.error.message}`);
  const frames: HeroFrame[] = [];
  const keys: string[] = [];
  let prev = '';
  for (let node = game.cursor.root; ; node = node.children[0]!) {
    const board = encode(node.fen);
    keys.push(node.positionKey);
    const pos = positionOf(node);
    const mate = gameStatus(pos) === 'checkmate';
    const white = node.ply % 2 === 1;
    frames.push({
      board,
      control: squareControl(node.fen),
      move: node.san && `${Math.ceil(node.ply / 2)}${white ? '.' : '...'} ${node.san}`,
      changed: prev ? [...board].flatMap((c, i) => (c !== prev[i] ? [i] : [])) : [],
      slides: prev ? slidesBetween(prev, board) : [],
      opening: classifyLine(openings, keys)?.name ?? null,
      beat: node.ply > 0 && (/[+#]/.test(node.san) || node.ply % 8 === 0),
      mated: mate ? board.indexOf(pos.turn === 'white' ? 'K' : 'k') : null,
    });
    prev = board;
    if (!node.children[0]) return frames;
  }
}

// Famous openings for each side, interleaved. Hand-picked, not ranked: we
// have no popularity data. Each name must exist in the openings table or it
// drops out, so the ticker never shows a name the table doesn't have.
const WHITE = [
  'Italian Game',
  'Ruy Lopez',
  "Queen's Gambit",
  'London System',
  'English Opening',
  'Scotch Game',
  "King's Gambit",
  'Vienna Game',
  'Catalan Opening',
  'Réti Opening',
];
const BLACK = [
  'Sicilian Defense',
  'French Defense',
  'Caro-Kann Defense',
  "King's Indian Defense",
  'Nimzo-Indian Defense',
  'Slav Defense',
  'Scandinavian Defense',
  'Pirc Defense',
  'Grünfeld Defense',
  'Dutch Defense',
];

export type TickerOpening = { name: string; side: 'white' | 'black'; href: string };

export function tickerOpenings(openings: OpeningTable): TickerOpening[] {
  const epdOf = new Map<string, string>();
  for (const [epd, [, name]] of Object.entries(openings)) if (!epdOf.has(name)) epdOf.set(name, epd);
  return WHITE.flatMap((w, i) => [
    { name: w, side: 'white' as const },
    { name: BLACK[i]!, side: 'black' as const },
  ]).flatMap(({ name, side }) => {
    const epd = epdOf.get(name);
    return epd ? [{ name, side, href: `/analysis/${fenToUrl(epd)}` }] : [];
  });
}
