'use client';

// Home hero: a board pulled apart into its layers (styles/hero.css). Scroll
// is a CSS timeline; the only JS here is the pointer tilt. The page computes
// the squares and shading on the server, so chessops stays off the client.
import { cn } from 'cn';
import { useEffect, useRef } from 'react';
import { usePrefs } from '@/lib/prefs';
import '@/styles/board.css';
import '@/styles/hero.css';

type Square = { role: string; color: 'white' | 'black' } | null;

// Staggered down the board's edge so the labels don't overlap at rest.
function Label({ at, children }: { at: string; children: string }) {
  return (
    <span
      className="hero-label font-mono text-[11px] tracking-widest text-muted-foreground uppercase"
      style={{ top: at }}
    >
      {children}
    </span>
  );
}

export function Hero({
  squares,
  control,
  caption,
  children,
}: {
  squares: Square[];
  control: number[];
  caption: string | null;
  children: React.ReactNode;
}) {
  const { prefs } = usePrefs();
  const tilt = useRef<HTMLDivElement>(null);

  // ponytail: the only JS in the hero; cut it first if it needs slimming.
  // Writes transform on one element, not a CSS variable, so the 130 squares
  // below don't recalculate style on every pointer move.
  useEffect(() => {
    const el = tilt.current;
    if (!el || !matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (e.clientX / innerWidth) * 2 - 1;
        const y = (e.clientY / innerHeight) * 2 - 1;
        el.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
      });
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => {
      removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="hero">
      <div className="hero-sticky mx-auto grid max-w-6xl items-center gap-4 px-4 pt-10 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pt-0">
        <div className="hero-copy flex flex-col items-start gap-6">{children}</div>
        <figure className="hero-stage">
          <div ref={tilt} className="hero-tilt">
            <div aria-hidden className={cn('hero-rig', `pieces-${prefs.pieceSet}`, `board-${prefs.boardTheme}`)}>
              <div className="hero-squares rounded-sm shadow-2xl">
                <Label at="70%">Board</Label>
              </div>
              <div className="hero-shade grid grid-cols-8 grid-rows-8">
                {control.map((c, i) => (
                  // White or black like the eval bar, never --primary (P1-UI-14).
                  <div
                    key={i}
                    className={c > 0 ? 'bg-white' : c < 0 ? 'bg-black' : undefined}
                    style={c ? { opacity: Math.min(Math.abs(c), 3) * 0.18 } : undefined}
                  />
                ))}
                <Label at="35%">Control</Label>
              </div>
              <div className="hero-pieces grid grid-cols-8 grid-rows-8">
                {squares.map((p, i) => (
                  <div key={i}>
                    {p && <span className={cn('cg-piece block size-full bg-cover', p.color, p.role)} />}
                  </div>
                ))}
                <Label at="0%">Pieces</Label>
              </div>
            </div>
          </div>
          {caption && (
            <figcaption className="mt-10 max-w-sm text-center text-sm text-muted-foreground">
              {caption}. Shading shows which side attacks each square more.
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
