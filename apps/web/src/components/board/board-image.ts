// PNG of a position and GIF of a line (P1-ST-08), drawn on a canvas with the
// user's piece set and board colors. No chessground: just squares and the
// same piece images the board uses.
import { boardSquares } from '@checkmate/chess';
import { applyPalette, GIFEncoder, quantize } from 'gifenc';

type Look = { pieceSet: string; boardTheme: string; orientation: 'white' | 'black' };
const SIZE = 480;
const LETTER: Record<string, string> = { pawn: 'P', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };

const images = new Map<string, Promise<HTMLImageElement>>();
function load(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}
// `mono` draws both colors with one image, as pieces.css does.
const piece = (set: string, color: string, role: string) =>
  load(`/assets/piece/${set}/${color[0]}${LETTER[role]}.svg`).catch(() =>
    load(`/assets/piece/${set}/${LETTER[role]}.svg`),
  );

function colors(theme: string) {
  const probe = document.createElement('div');
  probe.className = `board-${theme}`;
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const out = { light: style.getPropertyValue('--sq-light').trim(), dark: style.getPropertyValue('--sq-dark').trim() };
  probe.remove();
  return out;
}

async function draw(ctx: CanvasRenderingContext2D, fen: string, look: Look) {
  const { light, dark } = colors(look.boardTheme);
  const sq = SIZE / 8;
  const squares = boardSquares(fen);
  if (look.orientation === 'black') squares.reverse();
  for (let i = 0; i < 64; i++) {
    const x = (i % 8) * sq;
    const y = Math.floor(i / 8) * sq;
    ctx.fillStyle = (Math.floor(i / 8) + i) % 2 ? dark : light;
    ctx.fillRect(x, y, sq, sq);
    const p = squares[i];
    if (p) ctx.drawImage(await piece(look.pieceSet, p.color, p.role), x, y, sq, sq);
  }
}

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return [c, c.getContext('2d', { willReadFrequently: true })!] as const;
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadPng(fen: string, look: Look, filename: string) {
  const [c, ctx] = canvas();
  await draw(ctx, fen, look);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (blob) save(blob, filename);
}

// One frame per position; the last one lingers.
export async function downloadGif(fens: string[], look: Look, filename: string) {
  const [, ctx] = canvas();
  const gif = GIFEncoder();
  for (const [i, fen] of fens.entries()) {
    await draw(ctx, fen, look);
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), SIZE, SIZE, { palette, delay: i === fens.length - 1 ? 3_000 : 800 });
  }
  gif.finish();
  save(new Blob([gif.bytes()], { type: 'image/gif' }), filename);
}
