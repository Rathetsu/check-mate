// Writes packages/chess/src/data/openings.json from lichess-org/chess-openings
// (CC0) at a pinned commit: every named line replayed through packages/chess
// and keyed by the positionKey it reaches (P1-AN-07). Output is committed.
//   node scripts/gen-openings.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applySan, INITIAL_FEN, isMoveError, positionKey, validateSetup } from '../packages/chess/src/index.ts';

const COMMIT = 'a6189a30dc273ccb21fc2536a9a2fefd5592a67a';
const OUT = join(import.meta.dirname, '../packages/chess/src/data/openings.json');

const start = validateSetup(INITIAL_FEN);
if (!start.ok) throw new Error('bad initial FEN');

const table: Record<string, [string, string]> = {};
for (const file of ['a', 'b', 'c', 'd', 'e']) {
  const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/${COMMIT}/${file}.tsv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  for (const row of (await res.text()).trim().split('\n').slice(1)) {
    const [eco, name, pgn] = row.split('\t') as [string, string, string];
    let pos = start.pos;
    for (const san of pgn.split(' ').filter((t) => !/^\d+\.$/.test(t))) {
      const played = applySan(pos, san);
      if (isMoveError(played)) throw new Error(`${eco} ${name}: ${played.message}`);
      pos = played.pos;
    }
    const key = positionKey(pos);
    if (table[key]) console.warn(`duplicate position: ${name} = ${table[key][1]}`);
    else table[key] = [eco, name];
  }
}

writeFileSync(OUT, `${JSON.stringify(table)}\n`);
console.info(`Wrote ${Object.keys(table).length} openings to ${OUT}`);
