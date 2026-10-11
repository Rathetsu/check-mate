// Endgame tablebase lookups (P1-AN-50..52) through the self-hosted
// lila-tablebase service. The FEN is validated by packages/chess first.
// Anything that keeps us from a definite answer (no service, a timeout, a
// position outside the installed tables) is `null`: the panel hides.
import { validateSetup } from '@checkmate/chess';
import { DomainError } from '../errors.ts';

// From the side to move's point of view. "maybe" means a win or loss that
// the 50-move rule might turn into a draw; cursed/blessed are 50-move draws.
export type TablebaseCategory = 'win' | 'maybe-win' | 'cursed-win' | 'draw' | 'blessed-loss' | 'maybe-loss' | 'loss';
export type TablebaseMove = { uci: string; san: string; category: TablebaseCategory; dtz: number | null };
export type TablebaseResult = {
  label: 'Tablebase';
  category: TablebaseCategory;
  dtz: number | null;
  moves: TablebaseMove[]; // best first; each from the side that played it
};

type Upstream = {
  category: string;
  dtz: number | null;
  moves?: { uci: string; san: string; category: string; dtz: number | null }[];
};

const CATEGORY: Record<string, TablebaseCategory> = {
  win: 'win',
  'syzygy-win': 'maybe-win',
  'maybe-win': 'maybe-win',
  'cursed-win': 'cursed-win',
  draw: 'draw',
  'blessed-loss': 'blessed-loss',
  'maybe-loss': 'maybe-loss',
  'syzygy-loss': 'maybe-loss',
  loss: 'loss',
};
const FLIP: Record<TablebaseCategory, TablebaseCategory> = {
  win: 'loss',
  'maybe-win': 'maybe-loss',
  'cursed-win': 'blessed-loss',
  draw: 'draw',
  'blessed-loss': 'cursed-win',
  'maybe-loss': 'maybe-win',
  loss: 'win',
};

export async function probeTablebase(fen: string): Promise<TablebaseResult | null> {
  const r = validateSetup(fen);
  if (!r.ok) throw new DomainError('BAD_FEN', 400, r.reasons.map((x) => x.message).join(' '));
  const base = process.env.TABLEBASE_URL;
  const maxPieces = Number(process.env.TABLEBASE_MAX_PIECES ?? 5);
  if (!base || r.pos.castles.castlingRights.nonEmpty() || r.pos.board.occupied.size() > maxPieces) return null;
  try {
    const res = await fetch(`${base}/standard?fen=${encodeURIComponent(r.fen)}`, {
      signal: AbortSignal.timeout(1_500),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Upstream;
    const category = CATEGORY[body.category];
    if (!category) return null; // 'unknown': the tables for it aren't installed
    const moves = (body.moves ?? []).flatMap((m) => {
      const after = CATEGORY[m.category];
      return after ? [{ uci: m.uci, san: m.san, category: FLIP[after], dtz: m.dtz === null ? null : -m.dtz }] : [];
    });
    return { label: 'Tablebase', category, dtz: body.dtz, moves };
  } catch {
    return null;
  }
}
