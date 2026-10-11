'use client';

// P1-AN-50..52: the tablebase result and each move's outcome, labelled
// "Tablebase" and kept apart from the engine. Hidden when there's no answer.
import type { TablebaseCategory, TablebaseResult } from '@checkmate/core';
import { cn } from 'cn';
import { useEffect, useState } from 'react';

const MAX_PIECES = 5; // the server checks again with TABLEBASE_MAX_PIECES

const TEXT: Record<TablebaseCategory, string> = {
  win: 'Win',
  'maybe-win': 'Win or 50-move draw',
  'cursed-win': 'Draw by the 50-move rule (cursed win)',
  draw: 'Draw',
  'blessed-loss': 'Draw by the 50-move rule (blessed loss)',
  'maybe-loss': 'Loss or 50-move draw',
  loss: 'Loss',
};
const TONE: Record<TablebaseCategory, string> = {
  win: 'text-foreground font-semibold',
  'maybe-win': 'text-foreground',
  'cursed-win': 'text-muted-foreground',
  draw: 'text-muted-foreground',
  'blessed-loss': 'text-muted-foreground',
  'maybe-loss': 'text-muted-foreground',
  loss: 'text-muted-foreground italic',
};

// Cheap client-side gate so most positions never ask the server.
function mightBeCovered(fen: string) {
  const [board = '', , castling = '-'] = fen.split(' ');
  return castling === '-' && (board.match(/[a-z]/gi)?.length ?? 99) <= MAX_PIECES;
}

export function TablebasePanel({
  fen,
  turn,
  onPlay,
}: {
  fen: string;
  turn: 'white' | 'black';
  onPlay: (uci: string) => void;
}) {
  const [state, setState] = useState<{ fen: string; result: TablebaseResult | null } | null>(null);
  const eligible = mightBeCovered(fen);

  useEffect(() => {
    if (!eligible) return;
    const ctl = new AbortController();
    fetch(`/api/v1/tablebase?fen=${encodeURIComponent(fen)}`, { signal: ctl.signal })
      .then((r) => (r.status === 200 ? (r.json() as Promise<TablebaseResult>) : null))
      .then((result) => setState({ fen, result }))
      .catch(() => {});
    return () => ctl.abort();
  }, [fen, eligible]);

  const result = eligible && state?.fen === fen ? state.result : null;
  if (!result) return null;
  const side = turn === 'white' ? 'White' : 'Black';
  return (
    <section aria-label="Tablebase" className="rounded-md border text-sm" data-testid="tablebase">
      <div className="flex items-baseline justify-between gap-2 border-b px-2 py-1.5">
        <span className="font-medium">{result.label}</span>
        <span data-testid="tablebase-result">
          {side} to move: {TEXT[result.category]}
          {result.dtz !== null && result.category !== 'draw' && (
            <span className="text-muted-foreground"> · DTZ {Math.abs(result.dtz)}</span>
          )}
        </span>
      </div>
      <ul className="max-h-48 divide-y overflow-y-auto">
        {result.moves.map((m) => (
          <li key={m.uci}>
            <button
              type="button"
              onClick={() => onPlay(m.uci)}
              className="flex w-full justify-between gap-2 px-2 py-1 text-left hover:bg-accent"
            >
              <span className="font-medium">{m.san}</span>
              <span className={cn(TONE[m.category])}>
                {TEXT[m.category]}
                {m.dtz !== null && m.category !== 'draw' && ` · DTZ ${Math.abs(m.dtz)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
