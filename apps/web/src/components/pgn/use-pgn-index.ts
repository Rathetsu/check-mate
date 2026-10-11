'use client';

import type { GameSummary, PgnError } from '@checkmate/chess';
import { useCallback, useEffect, useRef } from 'react';

type Indexed = { games: GameSummary[]; error?: PgnError };

// One worker per dialog; requests are answered in order.
export function usePgnIndex() {
  const worker = useRef<Worker | null>(null);
  const pending = useRef<((data: unknown) => void)[]>([]);

  useEffect(() => {
    const w = new Worker(new URL('../../workers/pgn-index.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => pending.current.shift()?.(e.data);
    worker.current = w;
    return () => w.terminate();
  }, []);

  const ask = useCallback(
    <T>(msg: unknown) =>
      new Promise<T>((resolve) => {
        pending.current.push(resolve as (data: unknown) => void);
        worker.current!.postMessage(msg);
      }),
    [],
  );

  const index = useCallback(
    async (text: string) => (await ask<{ result: Indexed }>({ type: 'index', text })).result,
    [ask],
  );
  const game = useCallback(async (i: number) => (await ask<{ text: string }>({ type: 'game', index: i })).text, [ask]);
  return { index, game };
}
