'use client';

// P1-AN-11: White's share of the bar is its winning chances. White, gray and
// black only: never the brand color (P1-UI-14).
import { winningChances, type Score } from '@checkmate/chess';
import { cn } from 'cn';
import { formatScore } from './format';

export function EvalBar({ score, flipped, className }: { score?: Score; flipped: boolean; className?: string }) {
  const white = score ? 50 + 50 * winningChances(score) : 50;
  return (
    <div
      role="img"
      aria-label={score ? `Evaluation ${formatScore(score)}` : 'No evaluation yet'}
      data-testid="eval-bar"
      className={cn('relative w-3 overflow-hidden rounded-sm bg-neutral-800', className)}
    >
      <div
        className={cn(
          'absolute inset-x-0 bg-neutral-100 transition-[height] duration-300 motion-reduce:transition-none',
          flipped ? 'top-0' : 'bottom-0',
        )}
        style={{ height: `${white}%` }}
      />
      <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-500" />
    </div>
  );
}
