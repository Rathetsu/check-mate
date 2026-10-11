'use client';

// A static picture of a position: study thumbnails and the multiboard
// (P1-ST-10, P1-ST-17). Plain DOM, so dozens of them cost nothing; the
// interactive board is <Board>.
import { boardSquares } from '@checkmate/chess';
import { cn } from 'cn';
import { usePrefs } from '@/lib/prefs';
import '@/styles/board.css';

export function MiniBoard({
  fen,
  orientation = 'white',
  className,
}: {
  fen: string;
  orientation?: 'white' | 'black';
  className?: string;
}) {
  const { prefs } = usePrefs();
  const squares = boardSquares(fen);
  if (orientation === 'black') squares.reverse();
  return (
    <div
      role="img"
      aria-label={`Position ${fen}`}
      className={cn(
        'grid aspect-square grid-cols-8 overflow-hidden rounded-sm',
        `pieces-${prefs.pieceSet}`,
        `board-${prefs.boardTheme}`,
        className,
      )}
    >
      {squares.map((p, i) => (
        <div key={i} className={(Math.floor(i / 8) + i) % 2 ? 'bg-(--sq-dark)' : 'bg-(--sq-light)'}>
          {p && <span className={cn('cg-piece block size-full bg-cover', p.color, p.role)} />}
        </div>
      ))}
    </div>
  );
}
