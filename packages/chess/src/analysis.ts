// The analysis contract (CORE-20..23, ADR 2026-10-10-09). Providers live
// elsewhere; only the browser Stockfish provider may parse UCI.
import type { Chess } from 'chessops/chess';
import { makeFen, validateSetup } from './fen.ts';
import { applyUci, legalDests, type Played } from './moves.ts';

export type Score = { kind: 'cp' | 'mate'; value: number; pov: 'white' };
export type Provenance = {
  provider: string;
  engine: string;
  version: string;
  flavor: string;
  depth: number;
  nodes: number;
  computedAt: string;
  where: 'browser' | 'server';
};
export type EngineLine = {
  multiPv: number;
  depth: number;
  selDepth?: number;
  nodes: number;
  score: Score;
  pv: string[]; // UCI
  provenance: Provenance; // CORE-21: every result carries it
};
export type EngineInfo = { id: string; name: string; flavor: string; threads: number };
export type AnalyzeOpts = { multiPv: number; depth: number | null; onUpdate: (lines: EngineLine[]) => void };
export type AnalysisStream = { cancel(): void };
export type EvalOpts = { depth: number; onProgress?: (done: number, total: number) => void; cancelled?: () => boolean };
export type PlyEval = { ply: number; score: Score; best?: string; provenance: Provenance };
export type VariationCheck =
  { legal: true; evals: PlyEval[] } | { legal: false; firstIllegalPly: number; reason: string };

export interface AnalysisProvider {
  readonly id: string;
  engines(): Promise<EngineInfo[]>;
  analyzePosition(fen: string, opts: AnalyzeOpts): AnalysisStream;
  getBestMoves(fen: string, opts: { multiPv: number; depth?: number; movetimeMs?: number }): Promise<EngineLine[]>;
  evaluateLine(fen: string, uci: string[], opts: EvalOpts): Promise<PlyEval[]>;
  validateVariation(fen: string, uci: string[], opts: EvalOpts): Promise<VariationCheck>;
}

// CORE-20: legality comes from the rules layer before any engine sees a line.
export function checkLine(
  fen: string,
  uci: string[],
): { ok: true; positions: Chess[] } | { ok: false; ply: number; reason: string } {
  const start = validateSetup(fen);
  if (!start.ok) return { ok: false, ply: 0, reason: start.reasons[0]!.message };
  const positions = [start.pos];
  for (let i = 0; i < uci.length; i++) {
    const played: Played | undefined = applyUci(positions[i]!, uci[i]!);
    if (!played) return { ok: false, ply: i + 1, reason: `${uci[i]} is illegal in this position.` };
    positions.push(played.pos);
  }
  return { ok: true, positions };
}

export async function validateWith(
  provider: Pick<AnalysisProvider, 'evaluateLine'>,
  fen: string,
  uci: string[],
  opts: EvalOpts,
): Promise<VariationCheck> {
  const check = checkLine(fen, uci);
  if (!check.ok) return { legal: false, firstIllegalPly: check.ply, reason: check.reason };
  return { legal: true, evals: await provider.evaluateLine(fen, uci, opts) };
}

// CORE-23: deterministic lines for tests and previews. Moves come from the
// rules layer; scores are fixed, labelled fake, and never shown as truth.
// `schedule` paces the updates (pass setTimeout in the browser).
export function createFakeProvider(
  opts: { steps?: number; delayMs?: number; schedule?: (fn: () => void, ms: number) => unknown } = {},
): AnalysisProvider {
  const steps = opts.steps ?? 3;
  const delayMs = opts.delayMs ?? 0;
  const schedule = opts.schedule ?? ((fn: () => void) => void Promise.resolve().then(fn));
  const provenance = (depth: number): Provenance => ({
    provider: 'fake',
    engine: 'Fake engine',
    version: '1',
    flavor: 'test',
    depth,
    nodes: depth * 1000,
    computedAt: new Date(0).toISOString(),
    where: 'browser',
  });

  const linesFor = (fen: string, multiPv: number, depth: number): EngineLine[] => {
    const start = validateSetup(fen);
    if (!start.ok) return [];
    const firsts = [...legalDests(start.pos)].flatMap(([from, tos]) => tos.map((to) => from + to)).sort();
    return firsts.slice(0, multiPv).flatMap((first, i) => {
      const pv = [first];
      let pos = applyUci(start.pos, first)?.pos;
      while (pos && pv.length < 4) {
        const reply = [...legalDests(pos)].flatMap(([from, tos]) => tos.map((to) => from + to)).sort()[0];
        if (!reply) break;
        pv.push(reply);
        pos = applyUci(pos, reply)?.pos;
      }
      return [
        {
          multiPv: i + 1,
          depth,
          nodes: depth * 1000,
          score: { kind: 'cp' as const, value: 30 - i * 20, pov: 'white' as const },
          pv,
          provenance: provenance(depth),
        },
      ];
    });
  };

  const provider: AnalysisProvider = {
    id: 'fake',
    engines: async () => [{ id: 'fake', name: 'Fake engine', flavor: 'test', threads: 1 }],
    analyzePosition(fen, { multiPv, onUpdate }) {
      let cancelled = false;
      const tick = (depth: number) =>
        schedule(() => {
          if (cancelled) return;
          onUpdate(linesFor(fen, multiPv, depth * 10));
          if (depth < steps) tick(depth + 1);
        }, delayMs);
      tick(1);
      return { cancel: () => void (cancelled = true) };
    },
    getBestMoves: async (fen, { multiPv }) => linesFor(fen, multiPv, steps * 10),
    async evaluateLine(fen, uci, { depth }) {
      const check = checkLine(fen, uci);
      if (!check.ok) return [];
      return check.positions.slice(1).map((pos, i) => ({
        ply: i + 1,
        score: { kind: 'cp' as const, value: 0, pov: 'white' as const },
        best: linesFor(makeFen(check.positions[i]!), 1, depth)[0]?.pv[0],
        provenance: provenance(depth),
      }));
    },
    validateVariation: (fen, uci, o) => validateWith(provider, fen, uci, o),
  };
  return provider;
}
