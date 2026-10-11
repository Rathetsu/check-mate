// Picks the analysis provider. The fake one (CORE-23) is reachable only in
// e2e builds (NEXT_PUBLIC_E2E=1) with `?engine=fake`, plus an optional
// `&engineDelay=<ms>` to pace its updates.
import { createFakeProvider } from '@checkmate/chess';
import { createBrowserStockfish, type Engine, type EngineConfig, type EngineStatus } from './browser-stockfish';

export * from './browser-stockfish';

const READY: EngineStatus = { kind: 'ready' }; // a stable snapshot for useSyncExternalStore

export function createEngine(cfg: EngineConfig): Engine {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
  if (process.env.NEXT_PUBLIC_E2E !== '1' || q?.get('engine') !== 'fake') return createBrowserStockfish(cfg);
  const fake = createFakeProvider({ steps: 3, delayMs: Number(q.get('engineDelay') ?? 50), schedule: setTimeout });
  return { ...fake, threads: 1, status: () => READY, subscribe: () => () => {}, terminate() {} };
}
