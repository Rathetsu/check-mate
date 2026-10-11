// The UCI parser against output captured from stockfish-19-lite-single.js
// (`go depth 8`, MultiPV 2), CORE-22.
import { expect, test } from 'vitest';
import { parseInfo } from './uci';

const CAPTURED = `Stockfish 19 Lite WASM by the Stockfish developers (see AUTHORS file)
id name Stockfish 19 Lite WASM
info string Network replica 1: Local memory. Shared memory not supported by the OS. Local allocation fallback.
info depth 1 seldepth 2 multipv 1 score cp 550 nodes 32 nps 10666 hashfull 0 time 3 pv a1a2
info depth 6 seldepth 9 multipv 2 score cp 509 nodes 2479 nps 413166 hashfull 1 time 6 pv e1c1 e8e7 c1d2 e7f6 d1a1 f6g5
info depth 1 seldepth 2 multipv 1 score mate 1 nodes 56 nps 56000 hashfull 0 time 1 pv a1a8
info depth 3 seldepth 4 multipv 1 score cp 31 lowerbound nodes 900 nps 9000 time 1 pv e2e4
info depth 9 currmove e2e4 currmovenumber 1
bestmove a1a6 ponder e8f8`;

test('reads depth, MultiPV, score, nodes, nps and the PV; skips the rest', () => {
  const infos = CAPTURED.split('\n').map(parseInfo);
  expect(infos.filter(Boolean)).toHaveLength(3);
  expect(infos[3]).toEqual({
    depth: 1,
    selDepth: 2,
    multiPv: 1,
    score: { kind: 'cp', value: 550 },
    nodes: 32,
    nps: 10666,
    pv: ['a1a2'],
  });
  expect(infos[4]).toMatchObject({ multiPv: 2, pv: ['e1c1', 'e8e7', 'c1d2', 'e7f6', 'd1a1', 'f6g5'] });
  expect(infos[5]!.score).toEqual({ kind: 'mate', value: 1 });
  expect(infos[6]).toBeNull(); // bound scores are guesses
});
