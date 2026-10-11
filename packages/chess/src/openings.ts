// Opening names (P1-AN-07) from lichess-org/chess-openings (CC0), generated
// by scripts/gen-openings.ts. Unclassified lines get no name, never a guess.
export type Opening = { eco: string; name: string };
export type OpeningTable = Record<string, [eco: string, name: string]>;

// 450 KB, so the browser loads it on demand instead of in the first bundle.
export const loadOpenings = (): Promise<OpeningTable> =>
  import('./data/openings.json', { with: { type: 'json' } }).then((m) => m.default as unknown as OpeningTable);

// The deepest named position along the line, as Lichess shows it.
export function classifyLine(table: OpeningTable, keys: string[]): Opening | null {
  for (let i = keys.length - 1; i >= 0; i--) {
    const hit = table[keys[i]!];
    if (hit) return { eco: hit[0], name: hit[1] };
  }
  return null;
}
