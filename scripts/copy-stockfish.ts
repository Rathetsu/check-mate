// Copies the four Stockfish 19 WASM builds from the `stockfish` package into
// apps/web/public/engine/ (gitignored), where the browser loads them. Each
// .wasm must sit next to its .js. Runs as the web app's postinstall.
//   node scripts/copy-stockfish.ts
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const WEB = join(import.meta.dirname, '../apps/web');
const OUT = join(WEB, 'public/engine');
const BUILDS = ['stockfish-19-lite-single', 'stockfish-19-lite', 'stockfish-19-single', 'stockfish-19'];

const bin = join(dirname(createRequire(join(WEB, 'package.json')).resolve('stockfish/package.json')), 'bin');
mkdirSync(OUT, { recursive: true });
for (const build of BUILDS)
  for (const ext of ['js', 'wasm']) {
    const from = join(bin, `${build}.${ext}`);
    const to = join(OUT, `${build}.${ext}`);
    if (!existsSync(to) || statSync(to).size !== statSync(from).size) copyFileSync(from, to);
  }
console.info(`Stockfish builds ready in ${OUT}`);
