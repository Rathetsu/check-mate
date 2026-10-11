'use client';

// The one chessboard (ADR 2026-10-10-08, P1-BD-01..11). The only file that
// imports chessground. It never decides legality: `dests` and `check` come
// from packages/chess, and illegal drops snap back without reaching onMove.
import type { Shape, SquareName } from '@checkmate/chess';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key, Role } from '@lichess-org/chessground/types';
import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/lib/prefs';
import '@/styles/board.css';

type Color = 'white' | 'black';
// Engine and hover arrows may use chessground's pale brushes too.
export type AutoShape = { orig: SquareName; dest?: SquareName; brush: Shape['brush'] | 'paleBlue' | 'paleGrey' };
export type BoardProps = {
  fen: string;
  orientation: Color;
  turnColor?: Color;
  dests?: Map<SquareName, SquareName[]>;
  lastMove?: [SquareName, SquareName];
  check?: boolean | Color;
  shapes?: Shape[];
  autoShapes?: AutoShape[];
  mode?: 'play' | 'view';
  movable?: 'both' | Color | 'none';
  onMove?: (uci: string) => void;
  onShapesChange?: (shapes: Shape[]) => void;
  announce?: string; // the last move in SAN, read by screen readers (P1-BD-10)
  className?: string;
};

const PROMOTIONS: Role[] = ['queen', 'rook', 'bishop', 'knight'];
const ROLE_CHAR: Partial<Record<Role, string>> = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };
const BRUSHES = new Set(['green', 'red', 'yellow', 'blue']);

const toDraw = (s: AutoShape): DrawShape => ({ orig: s.orig, dest: s.dest, brush: s.brush });
const fromDraw = (shapes: DrawShape[]): Shape[] =>
  shapes
    .filter((s) => s.brush && BRUSHES.has(s.brush))
    .map((s) => ({
      orig: s.orig as SquareName,
      ...(s.dest ? { dest: s.dest as SquareName } : {}),
      brush: s.brush as Shape['brush'],
    }));

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Board(props: BoardProps) {
  const { prefs } = usePrefs();
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const latest = useRef(props);
  // Declared first, so the effects below and chessground's callbacks always
  // see the current props.
  useEffect(() => {
    latest.current = props;
  });
  const [promotion, setPromotion] = useState<{ from: Key; to: Key; color: Color } | null>(null);

  const config = (): Config => {
    const p = latest.current;
    const mode = p.mode ?? 'play';
    return {
      fen: p.fen,
      orientation: p.orientation,
      turnColor: p.turnColor,
      check: p.check ?? false,
      lastMove: p.lastMove,
      coordinates: prefs.showCoords,
      viewOnly: mode === 'view',
      animation: { enabled: prefs.animationMs > 0 && !reducedMotion(), duration: prefs.animationMs },
      highlight: { lastMove: true, check: true },
      movable: {
        free: false,
        color: p.movable === 'none' ? undefined : (p.movable ?? 'both'),
        dests: (p.dests ?? new Map()) as Map<Key, Key[]>,
        showDests: prefs.showLegalDests,
        events: { after: onAfter },
      },
      premovable: { enabled: false }, // P1-BD-09
      predroppable: { enabled: false },
      draggable: { enabled: prefs.moveInput !== 'click', showGhost: true },
      selectable: { enabled: prefs.moveInput !== 'drag' },
      drawable: {
        enabled: true,
        shapes: (p.shapes ?? []).map(toDraw),
        autoShapes: (p.autoShapes ?? []).map(toDraw),
        onChange: (shapes) => latest.current.onShapesChange?.(fromDraw(shapes)),
      },
    };
  };

  function onAfter(from: Key, to: Key) {
    const piece = api.current?.state.pieces.get(to);
    if (piece?.role === 'pawn' && (to[1] === '8' || to[1] === '1')) setPromotion({ from, to, color: piece.color });
    else latest.current.onMove?.(from + to);
  }

  // chessground reads `coordinates` only at creation, so that preference
  // remounts it; everything else goes through `set` or CSS classes (P1-BD-08).
  useEffect(() => {
    api.current = Chessground(el.current!, config());
    return () => api.current?.destroy();
  }, [prefs.showCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every input change goes to chessground; `set` with a fen also resets the
  // drawn shapes, so they always travel with it.
  useEffect(() => {
    api.current?.set(config());
  });

  const finishPromotion = (role: Role | null) => {
    if (!promotion) return;
    setPromotion(null);
    if (role) latest.current.onMove?.(promotion.from + promotion.to + ROLE_CHAR[role]);
    else api.current?.set({ fen: latest.current.fen, lastMove: latest.current.lastMove }); // cancelled
  };

  // Escape cancels wherever focus is (P1-BD-03).
  useEffect(() => {
    if (!promotion) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finishPromotion(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={cn('relative w-full', `pieces-${prefs.pieceSet}`, `board-${prefs.boardTheme}`, props.className)}>
      <div ref={el} className="aspect-square w-full" data-testid="board" />
      {promotion && (
        <div
          role="dialog"
          aria-label="Promote to"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
        >
          <div className="flex gap-1 rounded-lg bg-background p-2 shadow-lg">
            {PROMOTIONS.map((role, i) => (
              <button
                key={role}
                type="button"
                autoFocus={i === 0}
                aria-label={`Promote to ${role}`}
                onClick={() => finishPromotion(role)}
                className="size-14 rounded-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className={cn('cg-piece block size-full bg-cover', promotion.color, role)} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => finishPromotion(null)}
              className="px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {props.announce}
      </div>
    </div>
  );
}
