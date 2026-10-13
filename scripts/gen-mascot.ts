// Writes the served mascot poses in apps/web/public/brand from the masters in
// apps/web/brand (ui-refresh spec, Brand assets). Every pose is scaled so the
// pawn's body covers the same area and stands on the same spot of one shared
// canvas, so swapping poses in the hero never makes the pawn jump. Area, not
// width: a leaning pose (celebrating) has a narrower base.
//   node scripts/gen-mascot.ts
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const BRAND = join(ROOT, 'apps/web/brand');
const OUT = join(ROOT, 'apps/web/public/brand');
const POSES: Record<string, string> = {
  mascot: 'mascot.png', // first: the others are scaled to match it
  'mascot-thinking': 'poses/mascot-thinking.png',
  'mascot-explaining': 'poses/mascot-explaining.png',
  'mascot-celebrating': 'poses/mascot-celebrating.png',
};
const BASE = 440; // the first pose's base width in px; the rest follow by area
const BAND = 0.06; // the base is the lowest 6% of the body

async function measure(file: string) {
  const { data, info } = await sharp(join(BRAND, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  // Alpha snap: the generator leaves the body at 253/255 and a faint haze.
  for (let i = 3; i < data.length; i += 4) data[i] = data[i]! >= 240 ? 255 : data[i]! <= 12 ? 0 : data[i]!;
  // The body is the largest connected blob; sparkles and "?" float apart.
  const seen = new Uint8Array(width * height);
  let body: number[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !data[start * 4 + 3]) continue;
    const blob = [start];
    seen[start] = 1;
    for (let k = 0; k < blob.length; k++) {
      const p = blob[k]!;
      const [x, y] = [p % width, Math.floor(p / width)];
      for (const q of [x > 0 && p - 1, x < width - 1 && p + 1, y > 0 && p - width, y < height - 1 && p + width])
        if (q !== false && !seen[q] && data[q * 4 + 3]) {
          seen[q] = 1;
          blob.push(q);
        }
    }
    if (blob.length > body.length) body = blob;
  }
  const ys = body.map((p) => Math.floor(p / width));
  const [top, bottom] = ys.reduce(([a, b], y) => [Math.min(a, y), Math.max(b, y)], [height, -1]);
  const base = body.filter((_, i) => ys[i]! >= bottom - (bottom - top) * BAND).map((p) => p % width);
  const [baseL, baseR] = base.reduce(([a, b], x) => [Math.min(a, x), Math.max(b, x)], [width, -1]);
  // Everything opaque, decorations included, is kept in the cut.
  let [left, right, cutTop] = [width, -1, height];
  for (let p = 0; p < seen.length; p++)
    if (data[p * 4 + 3])
      [left, right, cutTop] = [
        Math.min(left, p % width),
        Math.max(right, p % width),
        Math.min(cutTop, Math.floor(p / width)),
      ];
  return {
    data,
    info,
    area: body.length,
    baseWidth: baseR - baseL + 1,
    centre: base.reduce((a, b) => a + b, 0) / base.length,
    box: { left, top: cutTop, width: right - left + 1, height: bottom - cutTop + 1 },
  };
}

const measured = await Promise.all(
  Object.entries(POSES).map(async ([name, file]) => ({ name, ...(await measure(file)) })),
);
const area = measured[0]!.area * (BASE / measured[0]!.baseWidth) ** 2;
const cuts = await Promise.all(
  measured.map(async (m) => {
    const scale = Math.sqrt(area / m.area);
    const img = await sharp(m.data, { raw: m.info })
      .extract(m.box)
      .resize({ width: Math.round(m.box.width * scale), kernel: 'lanczos3' })
      .png()
      .toBuffer({ resolveWithObject: true });
    return { name: m.name, img, anchor: Math.round((m.centre - m.box.left) * scale) };
  }),
);
const half = Math.max(...cuts.map((c) => Math.max(c.anchor, c.img.info.width - c.anchor)));
const tall = Math.max(...cuts.map((c) => c.img.info.height));
const pad = Math.round(tall * 0.03);
const [w, h] = [2 * (half + pad), tall + 2 * pad];
for (const { name, img, anchor } of cuts) {
  await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: img.data, left: pad + half - anchor, top: pad + tall - img.info.height }])
    .webp({ quality: 88, effort: 6 })
    .toFile(join(OUT, `${name}.webp`));
}
console.log(`${cuts.length} poses, ${w}×${h}, base centred at x=${pad + half}`);
