'use client';

// The engine panel (P1-AN-10..17): on/off, provenance, and up to five lines
// with SAN principal variations. Clicking a move plays the line up to it.
import { sanLine, validateSetup, type EngineLine } from '@checkmate/chess';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import type { EngineStatus } from '@/engine';
import { formatNps, formatScore } from './format';

const SHOWN = 12; // PV moves before "…"

type Props = {
  fen: string;
  on: boolean;
  status: EngineStatus;
  lines: EngineLine[];
  threads: number;
  onToggle: (on: boolean) => void;
  onSettings: () => void;
  onPlay: (uci: string[]) => void;
  onHover: (uci: string | null) => void;
};

export function EnginePanel({ fen, on, status, lines, threads, onToggle, onSettings, onPlay, onHover }: Props) {
  const best = lines[0];
  const start = validateSetup(fen);
  const ply = start.ok ? (start.pos.fullmoves - 1) * 2 + (start.pos.turn === 'white' ? 0 : 1) : 0;
  const p = best?.provenance;

  return (
    <section aria-label="Engine" className="rounded-md border">
      <div className="flex items-center gap-2 border-b px-2 py-1.5">
        <Switch checked={on} onCheckedChange={onToggle} aria-label="Engine" />
        <span className="font-mono text-lg font-semibold tabular-nums" data-testid="engine-eval">
          {on && best ? formatScore(best.score) : ''}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" data-testid="engine-provenance">
          {on && p
            ? [p.engine, `depth ${p.depth}`, formatNps(best.nps), threads > 1 ? `${threads} threads` : null, p.where]
                .filter(Boolean)
                .join(' · ')
            : on
              ? statusText(status)
              : 'Press x to start the engine'}
        </span>
        <Button variant="ghost" size="icon" aria-label="Engine settings" onClick={onSettings}>
          <Settings2 aria-hidden />
        </Button>
      </div>
      {on && status.kind === 'loading' && status.progress !== undefined && (
        <Progress value={status.progress * 100} aria-label="Engine download" className="h-1 rounded-none" />
      )}
      {on && status.kind === 'error' && <p className="p-2 text-sm text-destructive">{status.message}</p>}
      {on && lines.length > 0 && start.ok && (
        <ol className="divide-y text-sm" data-testid="engine-lines">
          {lines.map((line) => {
            const sans = sanLine(start.pos, line.pv.slice(0, SHOWN));
            return (
              <li
                key={line.multiPv}
                data-pv={line.pv.join(' ')}
                className="flex gap-2 px-2 py-1"
                onMouseEnter={() => onHover(line.pv[0] ?? null)}
                onMouseLeave={() => onHover(null)}
              >
                <span className="w-12 shrink-0 font-mono font-semibold tabular-nums">{formatScore(line.score)}</span>
                <span className="min-w-0 truncate">
                  {sans.map((san, i) => {
                    const n = ply + i;
                    const num = n % 2 === 0 ? `${n / 2 + 1}.` : i === 0 ? `${(n + 1) / 2}...` : '';
                    return (
                      <span key={i}>
                        {num && <span className="text-muted-foreground">{num}</span>}
                        <button
                          type="button"
                          className="rounded px-0.5 hover:bg-accent"
                          onClick={() => onPlay(line.pv.slice(0, i + 1))}
                        >
                          {san}
                        </button>{' '}
                      </span>
                    );
                  })}
                  {line.pv.length > SHOWN && '…'}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function statusText(s: EngineStatus) {
  if (s.kind === 'error') return 'Engine unavailable';
  if (s.kind === 'loading') return s.progress === undefined ? 'Loading engine…' : 'Downloading engine…';
  return 'Thinking…';
}
