// Winning chances and the practice-mode verdict, adapted from lila
// ui/lib/src/ceval/winningChances.ts and ui/analyse/src/practice/practiceCtrl.ts
// at commit 46d24871f68844ec1df18ab8618b5156ffbe4e56 (AGPL-3.0-or-later,
// lichess-org/lila). The multiplier comes from lila PR #11148.
import type { Score } from './analysis.ts';

type Color = 'white' | 'black';

const raw = (cp: number): number => 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;

// -1 (White is lost) to 1 (White is winning). Centipawns are clamped to
// ±1000; a mate in n counts as (21 − min(10, n)) × 100 centipawns.
export function winningChances(score: Score): number {
  if (score.kind === 'cp') return raw(Math.min(Math.max(-1000, score.value), 1000));
  const cp = (21 - Math.min(10, Math.abs(score.value))) * 100;
  return raw(score.value > 0 ? cp : -cp);
}

export const povChances = (color: Color, score: Score): number =>
  color === 'white' ? winningChances(score) : -winningChances(score);

// Half the change in winning chances: 1 = `a` is infinitely better than `b`.
export const povDiff = (color: Color, a: Score, b: Score): number => (povChances(color, a) - povChances(color, b)) / 2;

export type Verdict = 'good' | 'inaccuracy' | 'mistake' | 'blunder';

// lila practiceCtrl.makeComment: how much the mover's winning chances fell,
// on povDiff's half scale. Playing the engine's best move is always good.
export function practiceVerdict(mover: Color, before: Score, after: Score): Verdict {
  const shift = -povDiff(mover, after, before);
  if (shift < 0.025) return 'good';
  if (shift < 0.06) return 'inaccuracy';
  if (shift < 0.14) return 'mistake';
  return 'blunder';
}
