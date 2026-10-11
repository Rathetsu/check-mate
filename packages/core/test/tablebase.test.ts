// Tablebase lookups (P1-AN-50..52) against a stub of the service.
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { probeTablebase } from '../src/services/tablebase.ts';

const KRVK = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
let server: Server;
let hits = 0;
let reply: unknown;

beforeAll(async () => {
  server = createServer((_req, res) => {
    hits++;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(reply));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  process.env.TABLEBASE_URL = `http://127.0.0.1:${port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  hits = 0;
  process.env.TABLEBASE_MAX_PIECES = '5';
  reply = {
    category: 'win',
    dtz: 31,
    moves: [
      { uci: 'a1a7', san: 'Ra7', category: 'loss', dtz: -30 },
      { uci: 'a1a8', san: 'Ra8+', category: 'syzygy-loss', dtz: -30 },
      { uci: 'e1d2', san: 'Kd2', category: 'unknown', dtz: null },
    ],
  };
});

test('maps the result to the side that moves, labelled Tablebase', async () => {
  expect(await probeTablebase(KRVK)).toEqual({
    label: 'Tablebase',
    category: 'win',
    dtz: 31,
    moves: [
      { uci: 'a1a7', san: 'Ra7', category: 'win', dtz: 30 },
      { uci: 'a1a8', san: 'Ra8+', category: 'maybe-win', dtz: 30 },
    ],
  });
});

test('positions the tables cannot answer are null, without asking the service', async () => {
  expect(await probeTablebase('r3k3/8/8/8/8/8/8/R3K3 w Qq - 0 1')).toBeNull(); // castling rights
  expect(await probeTablebase('4k3/8/8/8/8/8/PPP5/R3K3 w - - 0 1')).toBeNull(); // 6 pieces
  expect(hits).toBe(0);
  reply = { category: 'unknown', dtz: null, moves: [] };
  expect(await probeTablebase(KRVK)).toBeNull(); // tables not installed
});

test('a bad FEN is a 400', async () => {
  await expect(probeTablebase('not a fen')).rejects.toMatchObject({ code: 'BAD_FEN', status: 400 });
});

test('no service, or none configured, is null (P1-AN-52)', async () => {
  const url = process.env.TABLEBASE_URL;
  process.env.TABLEBASE_URL = 'http://127.0.0.1:1';
  expect(await probeTablebase(KRVK)).toBeNull();
  delete process.env.TABLEBASE_URL;
  expect(await probeTablebase(KRVK)).toBeNull();
  process.env.TABLEBASE_URL = url;
});
