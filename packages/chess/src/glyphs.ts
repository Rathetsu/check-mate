// Annotation glyphs (P1-AN-04). Ids, symbols, names and groups copied from
// scalachess core/src/main/scala/format/pgn/Glyph.scala at commit
// 2ab0a403d7f4a8a3a6dec2e898e6b4c301d0aaad (MIT, lichess-org/scalachess).
export type GlyphGroup = 'move' | 'position' | 'observation';
export type Glyph = { id: number; symbol: string; name: string; group: GlyphGroup };

const g = (group: GlyphGroup, list: [number, string, string][]): Glyph[] =>
  list.map(([id, symbol, name]) => ({ id, symbol, name, group }));

export const GLYPHS: Glyph[] = [
  ...g('move', [
    [1, '!', 'Good move'],
    [2, '?', 'Mistake'],
    [3, '!!', 'Brilliant move'],
    [4, '??', 'Blunder'],
    [5, '!?', 'Interesting move'],
    [6, '?!', 'Dubious move'],
    [7, '□', 'Only move'],
    [22, '⨀', 'Zugzwang'],
  ]),
  ...g('position', [
    [10, '=', 'Equal position'],
    [13, '∞', 'Unclear position'],
    [14, '⩲', 'White is slightly better'],
    [15, '⩱', 'Black is slightly better'],
    [16, '±', 'White is better'],
    [17, '∓', 'Black is better'],
    [18, '+−', 'White is winning'],
    [19, '−+', 'Black is winning'],
  ]),
  ...g('observation', [
    [146, 'N', 'Novelty'],
    [32, '↑↑', 'Development'],
    [36, '↑', 'Initiative'],
    [40, '→', 'Attack'],
    [132, '⇆', 'Counterplay'],
    [138, '⊕', 'Time trouble'],
    [44, '=∞', 'With compensation'],
    [140, '∆', 'With the idea'],
  ]),
];

export const glyphById = new Map(GLYPHS.map((x) => [x.id, x]));

// scalachess Glyphs.toggle: one move glyph, one position glyph, any number
// of observations. Unknown NAGs from imported PGN are kept as they are.
export function toggleGlyph(nags: number[], id: number): number[] {
  if (nags.includes(id)) return nags.filter((n) => n !== id);
  const group = glyphById.get(id)?.group;
  const keep = group === 'observation' ? nags : nags.filter((n) => glyphById.get(n)?.group !== group);
  return [...keep, id];
}
