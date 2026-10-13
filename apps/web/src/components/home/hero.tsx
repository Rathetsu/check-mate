'use client';

// Home hero (home-motion spec): Morphy's Opera Game replays on a board split
// into its layers, and the layers part on checks so you see what the coach
// sees. The page builds the frames on the server (lib/hero-game), so chessops
// stays off the client: this file only plays them. Motion is on a clock, not
// the scroll, and stops for Pause, reduced motion, a hidden tab or off-screen.
import { cn } from 'cn';
import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HeroFrame } from '@/lib/hero-game';
import { usePrefs } from '@/lib/prefs';
import { PauseMotion, useMotion } from './motion';
import '@/styles/board.css';
import '@/styles/hero.css';

const ROLE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const pieceClass = (c: string) => `${c === c.toUpperCase() ? 'white' : 'black'} ${ROLE[c.toLowerCase()]}`;
const squareName = (i: number) => 'abcdefgh'[i % 8]! + (8 - (i >> 3));

const PLY_MS = 1600;
const BEAT_MS = 2600; // a move that parts the layers stays up longer
const INTRO_MS = 2000; // the opening still (the final mate) before the replay
const MATE_MS = 5000;
const FADE_MS = 400; // matches the .hero-pieces opacity transition

const POSES = ['mascot', 'mascot-thinking', 'mascot-explaining', 'mascot-celebrating'] as const;
type Pose = (typeof POSES)[number];

// Faint lines that draw and retract behind the hero, kept off the copy
// column: [left %, top %, length px, angle, seconds, delay].
const TRACES: [number, number, number, number, number, number][] = [
  [8, 7, 300, 0, 13, 0],
  [96, 10, 260, 135, 17, 3],
  [62, 86, 340, 0, 19, 6],
  [56, 14, 220, 90, 23, 2],
  [92, 58, 240, 90, 15, 9],
  [36, 95, 320, 0, 21, 12],
  [70, 4, 200, 45, 11, 5],
];

// Staggered down the board's edge so the labels don't overlap.
function Label({ at, name, children }: { at: string; name: string; children: React.ReactNode }) {
  return (
    <span className="hero-label font-mono text-[11px] tracking-widest uppercase" style={{ top: at }}>
      <span className="text-muted-foreground">{name}</span>
      <span className="text-foreground normal-case">{children}</span>
    </span>
  );
}

export function Hero({ frames, children }: { frames: HeroFrame[]; children: React.ReactNode }) {
  const { prefs } = usePrefs();
  const { paused, reduced } = useMotion();
  const last = frames.length - 1;
  // The first paint, and the reduced-motion still, is the final mate.
  const [{ ply, stage }, setStep] = useState<{ ply: number; stage: 'show' | 'beat' | 'fade' }>({
    ply: last,
    stage: 'show',
  });
  const [onScreen, setOnScreen] = useState(true);
  const [hover, setHover] = useState(false);
  const firstLoop = useRef(true);
  const prevPly = useRef(ply);
  const section = useRef<HTMLElement>(null);
  const stageEl = useRef<HTMLElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const pieces = useRef<HTMLDivElement>(null);
  const mascot = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const running = !reduced && !paused && onScreen;
  const frame = frames[ply]!;

  // The clock: one timeout per step.
  useEffect(() => {
    if (!running) return;
    const advance = (p: number) => ({ ply: p, stage: frames[p]!.beat ? ('beat' as const) : ('show' as const) });
    const [ms, next] =
      stage === 'fade'
        ? [FADE_MS, { ply: 0, stage: 'show' as const }]
        : ply === last
          ? [firstLoop.current ? INTRO_MS : MATE_MS, { ply, stage: 'fade' as const }]
          : [stage === 'beat' ? BEAT_MS : PLY_MS, advance(ply + 1)];
    const t = setTimeout(() => {
      if (next.stage === 'fade') firstLoop.current = false;
      setStep(next);
    }, ms);
    return () => clearTimeout(t);
  }, [running, ply, stage, last, frames]);

  // Pause off-screen and in a hidden tab, so the game never plays unseen.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let seen = true;
    const update = () => setOnScreen(seen && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      seen = !!e?.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  // Slide the moved pieces in from where they were: transform only.
  useLayoutEffect(() => {
    const from = prevPly.current;
    prevPly.current = ply;
    if (ply !== from + 1 || !pieces.current) return;
    for (const [a, b] of frames[ply]!.slides) {
      const el = pieces.current.children[b]?.firstElementChild;
      el?.animate(
        [
          { transform: `translate(${((a % 8) - (b % 8)) * 100}%, ${((a >> 3) - (b >> 3)) * 100}%)` },
          { transform: 'none' },
        ],
        { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' },
      );
    }
  }, [ply, frames]);

  // Pointer parallax and the square readout. Writes transforms on a few
  // elements, not CSS variables, so the 130 squares don't restyle per move.
  useEffect(() => {
    const fig = stageEl.current;
    const [rig, pawn, label] = [tilt.current, mascot.current, readout.current];
    if (!fig || !rig || !pawn || !label) return;
    if (!matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const sq = (e.target as Element).closest('[data-sq]')?.getAttribute('data-sq');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = fig.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = ((e.clientY - r.top) / r.height) * 2 - 1;
        rig.style.transform = `rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
        pawn.style.transform = `translateX(${(-x * 12).toFixed(1)}px)`;
        label.style.opacity = sq ? '1' : '0';
        if (sq) {
          label.textContent = squareName(Number(sq));
          label.style.transform = `translate3d(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px, 0)`;
        }
      });
    };
    const onEnter = () => setHover(true);
    const onLeave = () => {
      cancelAnimationFrame(raf);
      setHover(false);
      rig.style.transform = pawn.style.transform = '';
      label.style.opacity = '0';
    };
    fig.addEventListener('pointermove', onMove, { passive: true });
    fig.addEventListener('pointerenter', onEnter);
    fig.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      fig.removeEventListener('pointermove', onMove);
      fig.removeEventListener('pointerenter', onEnter);
      fig.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const mate = frame.mated !== null && stage !== 'fade';
  const open = hover || mate || stage === 'beat';
  const pose: Pose = mate
    ? 'mascot-celebrating'
    : stage === 'fade' || ply === 0
      ? 'mascot-thinking'
      : open
        ? 'mascot-explaining'
        : 'mascot';
  const white = frame.control.filter((c) => c > 0).length;
  const black = frame.control.filter((c) => c < 0).length;

  return (
    <section ref={section} className="hero">
      <div aria-hidden className="hero-backdrop">
        <div className="hero-dots" />
        <div className="hero-files font-mono">
          {[...'abcdefgh'].map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
        <div className="hero-ranks font-mono">
          {[8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
        {TRACES.map(([left, top, width, angle, s, delay], i) => (
          <div
            key={i}
            className="hero-trace"
            style={{ left: `${left}%`, top: `${top}%`, width, rotate: `${angle}deg` }}
          >
            <i style={{ animationDuration: `${s}s`, animationDelay: `${delay}s` }} />
          </div>
        ))}
      </div>

      <div className="hero-grid mx-auto grid max-w-6xl items-center gap-4 px-4 pt-10 pb-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-0">
        <div className="flex flex-col items-start gap-6">{children}</div>
        <figure ref={stageEl} className="hero-stage">
          <div className="hero-board" data-open={open || undefined} data-fade={stage === 'fade' || undefined}>
            <div ref={tilt} className="hero-tilt">
              <div aria-hidden className={cn('hero-rig', `pieces-${prefs.pieceSet}`, `board-${prefs.boardTheme}`)}>
                <div className="hero-squares rounded-sm shadow-2xl">
                  {frame.changed.map((i) => (
                    <div
                      key={i}
                      className="hero-last"
                      style={{ left: `${(i % 8) * 12.5}%`, top: `${(i >> 3) * 12.5}%` }}
                    />
                  ))}
                  <Label at="70%" name="Board">
                    {frame.slides.map(([a, b]) => `${squareName(a)}→${squareName(b)}`).join(' ') || 'the start'}
                  </Label>
                </div>
                <div className="hero-shade grid grid-cols-8 grid-rows-8">
                  {frame.control.map((c, i) => (
                    // White or black like the eval bar, never --primary (P1-UI-14).
                    <div
                      key={i}
                      className={c > 0 ? 'bg-white' : c < 0 ? 'bg-black' : undefined}
                      style={{ opacity: Math.min(Math.abs(c), 3) * 0.18 }}
                    />
                  ))}
                  <Label at="35%" name="Control">
                    <span className="flex items-center gap-1.5">
                      <span className="ticker-dot white" />
                      {white}
                      <span className="ticker-dot black ml-1" />
                      {black}
                    </span>
                  </Label>
                </div>
                <div ref={pieces} className="hero-pieces grid grid-cols-8 grid-rows-8">
                  {[...frame.board].map((c, i) => (
                    <div key={i} data-sq={i}>
                      {c !== '.' && (
                        <span
                          className={cn(
                            'cg-piece block size-full bg-cover',
                            pieceClass(c),
                            mate && i === frame.mated && 'hero-toppled',
                          )}
                        />
                      )}
                    </div>
                  ))}
                  <Label at="0%" name="Pieces">
                    {mate ? `${frame.move} Checkmate` : (frame.move ?? 'Ready')}
                  </Label>
                </div>
              </div>
            </div>
            {/* Already sized and compressed: scripts/gen-mascot.ts. */}
            <div ref={mascot} aria-hidden className="hero-mascot">
              <div className="hero-bob">
                {POSES.map((p) => (
                  <Image
                    key={p}
                    src={`/brand/${p}.webp`}
                    alt=""
                    width={722}
                    height={909}
                    unoptimized
                    loading={p === 'mascot' || p === 'mascot-celebrating' ? 'eager' : 'lazy'}
                    data-on={p === pose || undefined}
                    className="hero-pose"
                  />
                ))}
              </div>
            </div>
          </div>
          <span ref={readout} aria-hidden className="hero-readout font-mono text-[11px] tracking-widest" />
          <figcaption className="mt-10 flex max-w-sm flex-col items-center gap-1.5 text-center">
            <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Fig. 1 · The Opera Game · Paris 1858
            </span>
            <span className="sr-only">An animated board replays the game to its final checkmate.</span>
            <span aria-hidden data-testid="hero-move" className="min-h-5 text-sm">
              {frame.move ?? 'The starting position'}
              {mate ? ' · Checkmate' : frame.opening && ` · ${frame.opening}`}
            </span>
            <span className="text-xs text-muted-foreground">
              Morphy vs. the Duke of Brunswick and Count Isouard. Shading shows which side attacks each square more.
            </span>
            <PauseMotion className="mt-1" />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
