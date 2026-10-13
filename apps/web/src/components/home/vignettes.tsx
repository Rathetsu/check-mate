'use client';

// Feature-card vignettes (home-motion spec): a small loop per tool in place
// of its icon. CSS only (hero.css), in the visitor's board theme and piece
// set. Nav entries without one keep their icon.
import { cn } from 'cn';
import { usePrefs } from '@/lib/prefs';
import '@/styles/board.css';

const frame = 'relative block h-18 w-24 overflow-hidden rounded-md'; // 4×3 squares

export function Vignette({ href, fallback }: { href: string; fallback: React.ReactNode }) {
  const { prefs } = usePrefs();
  const theme = cn(`board-${prefs.boardTheme}`, `pieces-${prefs.pieceSet}`);

  if (href === '/analysis')
    // An arrow draws itself across the board, in chessground's green brush.
    return (
      <span aria-hidden className={cn(frame, 'vig-board', theme)}>
        <span className="absolute top-[70%] left-[18%] h-[3px] w-[52%] origin-left -rotate-[34deg]">
          <span className="vig-shaft absolute inset-0 rounded-full bg-[#15781B]/85" />
          <span className="vig-head absolute top-1/2 -right-1.5 size-0 -translate-y-1/2 border-y-[6px] border-l-[9px] border-y-transparent border-l-[#15781B]/85" />
        </span>
      </span>
    );

  if (href === '/editor')
    // A knight drops onto a square, then lifts off.
    return (
      <span aria-hidden className={cn(frame, 'vig-board', theme)}>
        <span className="vig-drop cg-piece white knight absolute top-[33.3%] left-[25%] block h-[33.3%] w-[25%] bg-contain bg-center bg-no-repeat" />
      </span>
    );

  if (href === '/studies')
    // Chapters light up in turn.
    return (
      <span aria-hidden className={cn(frame, 'flex flex-col justify-center border bg-card px-2')}>
        <span className="relative flex flex-col">
          <span className="vig-step absolute inset-x-[-0.25rem] top-0 h-4 rounded-sm border-l-2 border-primary bg-primary/10" />
          {[60, 80, 45].map((w, i) => (
            <span key={i} className="relative flex h-4 items-center gap-1.5">
              <span className="font-mono text-[9px] text-muted-foreground">{i + 1}</span>
              <span className="h-1 rounded-full bg-muted-foreground/30" style={{ width: `${w}%` }} />
            </span>
          ))}
        </span>
      </span>
    );

  return fallback;
}
