import type { Score } from '@checkmate/chess';

// "+1.3", "-0.4", "#5", "#-4": always from White's point of view (P1-AN-11).
export function formatScore(score: Score): string {
  if (score.kind === 'mate') return `#${score.value}`;
  const pawns = score.value / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

export function formatNps(nps?: number): string | null {
  if (!nps) return null;
  return nps >= 1e6 ? `${(nps / 1e6).toFixed(1)} Mn/s` : `${Math.round(nps / 1e3)} kn/s`;
}
