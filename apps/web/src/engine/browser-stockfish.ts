// Stockfish 19 in a Web Worker behind AnalysisProvider (ADR 2026-10-10-09,
// CORE-22). Search handling follows lila's ceval: a new search stops the
// running one and starts only after its `bestmove`, so output from an old
// position can never be read as the new one (P1-AN-16).
import {
  checkLine,
  legalDests,
  makeFen,
  validateSetup,
  validateWith,
  type AnalysisProvider,
  type EngineLine,
  type PlyEval,
  type Provenance,
} from '@checkmate/chess';
import { parseInfo } from './uci';

export type Flavor = 'lite' | 'full';
export type EngineStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; progress?: number } // progress 0-1 while a big build downloads
  | { kind: 'ready' }
  | { kind: 'error'; message: string };
export type EngineConfig = { flavor: Flavor; threads: number; hashMb: number };

export type Engine = AnalysisProvider & {
  status(): EngineStatus;
  subscribe(fn: () => void): () => void;
  terminate(): void; // the next search boots a fresh worker
  threads: number;
};

type Search = {
  fen: string;
  white: boolean;
  multiPv: number;
  expected: number; // MultiPV lines per depth: fewer when there are fewer legal moves
  go: string;
  lines: EngineLine[];
  cancelled: boolean;
  onUpdate?: (lines: EngineLine[]) => void;
  onDone?: (lines: EngineLine[]) => void;
};

export const maxThreads = () =>
  typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated
    ? Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1))
    : 1;

export function createBrowserStockfish(cfg: EngineConfig): Engine {
  const threads = Math.max(1, Math.min(cfg.threads, maxThreads()));
  const build = `stockfish-19${cfg.flavor === 'lite' ? '-lite' : ''}${threads > 1 ? '' : '-single'}`;
  const listeners = new Set<() => void>();
  let status: EngineStatus = { kind: 'idle' };
  let worker: Worker | null = null;
  let name = 'Stockfish 19';
  let current: Search | null = null; // running on the engine
  let next: Search | null = null; // waits for the running search to stop
  let multiPv = 1;

  const setStatus = (s: EngineStatus) => {
    status = s;
    for (const fn of listeners) fn();
  };
  const post = (cmd: string) => worker?.postMessage(cmd);

  function boot() {
    if (typeof WebAssembly !== 'object') {
      setStatus({ kind: 'error', message: "This browser can't run the engine (no WebAssembly)." });
      return;
    }
    setStatus({ kind: 'loading' });
    worker = new Worker(`/engine/${build}.js`);
    worker.onmessage = (e: MessageEvent<unknown>) => {
      if (typeof e.data === 'string') return void e.data.split('\n').forEach(handle);
      const p = e.data as { loaded?: number; total?: number } | null;
      if (p?.total) setStatus({ kind: 'loading', progress: (p.loaded ?? 0) / p.total });
    };
    worker.onerror = (e) => {
      e.preventDefault();
      fail(`The engine stopped working${e.message ? `: ${e.message}` : ''}.`);
    };
    post('uci');
  }

  function fail(message: string) {
    worker?.terminate();
    worker = null;
    current = next = null;
    setStatus({ kind: 'error', message });
  }

  function handle(line: string) {
    if (line.startsWith('id name ')) name = line.slice(8).trim();
    else if (line === 'uciok') {
      post(`setoption name Threads value ${threads}`);
      post(`setoption name Hash value ${cfg.hashMb}`);
      post('isready');
    } else if (line === 'readyok') {
      if (status.kind !== 'ready') setStatus({ kind: 'ready' });
      if (!current && next) launch();
    } else if (line.startsWith('bestmove')) {
      const done = current;
      current = null;
      if (done && !done.cancelled) done.onDone?.(done.lines);
      if (next) launch();
    } else if (current && !current.cancelled) read(current, line);
  }

  function read(s: Search, line: string) {
    const info = parseInfo(line);
    if (!info || info.multiPv > s.multiPv) return;
    const sign = s.white ? 1 : -1;
    const provenance: Provenance = {
      provider: 'stockfish',
      engine: name,
      version: '19',
      flavor: cfg.flavor,
      depth: info.depth,
      nodes: info.nodes,
      computedAt: new Date().toISOString(),
      where: 'browser',
    };
    s.lines[info.multiPv - 1] = {
      multiPv: info.multiPv,
      depth: info.depth,
      selDepth: info.selDepth,
      nodes: info.nodes,
      nps: info.nps,
      score: { kind: info.score.kind, value: sign * info.score.value, pov: 'white' },
      pv: info.pv,
      provenance,
    };
    // One update per finished depth, once every line of it has arrived.
    if (info.multiPv === s.expected) s.onUpdate?.(s.lines.slice(0, s.expected));
  }

  function launch() {
    const s = next!;
    next = null;
    current = s;
    if (s.multiPv !== multiPv) post(`setoption name MultiPV value ${(multiPv = s.multiPv)}`);
    post(`position fen ${s.fen}`);
    post(s.go);
  }

  function start(s: Search) {
    if (next) next.cancelled = true;
    next = s;
    if (!worker) boot();
    if (current) post('stop');
    else if (status.kind === 'ready') launch();
  }

  function search(fen: string, multiPv: number, go: string, hooks: Pick<Search, 'onUpdate' | 'onDone'>): Search | null {
    const r = validateSetup(fen);
    if (!r.ok) return null;
    const moves = [...legalDests(r.pos).values()].reduce((n, d) => n + d.length, 0);
    if (!moves) return null; // game over: the rules layer reports it (P1-AN-18)
    const s: Search = {
      fen: r.fen,
      white: r.pos.turn === 'white',
      multiPv: Math.max(1, Math.min(5, multiPv)),
      expected: Math.min(multiPv, moves),
      go,
      lines: [],
      cancelled: false,
      ...hooks,
    };
    start(s);
    return s;
  }

  function cancel(s: Search | null) {
    if (!s) return;
    s.cancelled = true;
    if (next === s) next = null;
    if (current === s) post('stop');
  }

  const bestMoves = (fen: string, multiPv: number, go: string) =>
    new Promise<EngineLine[]>((resolve) => {
      if (!search(fen, multiPv, go, { onDone: resolve })) resolve([]);
    });

  const engine: Engine = {
    id: 'stockfish',
    threads,
    status: () => status,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    terminate() {
      worker?.terminate();
      worker = null;
      current = next = null;
      multiPv = 1;
      setStatus({ kind: 'idle' });
    },
    engines: async () => [{ id: build, name, flavor: cfg.flavor, threads }],
    analyzePosition(fen, { multiPv: n, depth, onUpdate }) {
      const s = search(fen, n, depth ? `go depth ${depth}` : 'go infinite', { onUpdate });
      return { cancel: () => cancel(s) };
    },
    getBestMoves: (fen, { multiPv: n, depth, movetimeMs }) =>
      bestMoves(fen, n, movetimeMs ? `go movetime ${movetimeMs}` : `go depth ${depth ?? 18}`),
    async evaluateLine(fen, uci, { depth, onProgress, cancelled }) {
      const check = checkLine(fen, uci);
      if (!check.ok) return [];
      const evals: PlyEval[] = [];
      for (let i = 1; i < check.positions.length && !cancelled?.(); i++) {
        const [line] = await bestMoves(makeFen(check.positions[i]!), 1, `go depth ${depth}`);
        if (line) evals.push({ ply: i, score: line.score, best: line.pv[0], provenance: line.provenance });
        onProgress?.(i, uci.length);
      }
      return evals;
    },
    validateVariation: (fen, uci, o) => validateWith(engine, fen, uci, o),
  };
  return engine;
}
