import path from 'node:path';
import type { NextConfig } from 'next';

// One .env at the repo root serves every app. Existing env vars win, so
// compose and CI settings are never overridden.
try {
  process.loadEnvFile(path.join(import.meta.dirname, '../../.env'));
} catch {}

const nextConfig: NextConfig = {
  output: 'standalone',
  // The dev badge sits bottom-left, on top of the nav rail's account button.
  devIndicators: false,
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Workspace packages ship TypeScript source (no build step).
  transpilePackages: ['@checkmate/core', '@checkmate/chess'],
  // AGPL §13 Source link (P1-UI-08). Set at image build time.
  env: { NEXT_PUBLIC_COMMIT_SHA: process.env.COMMIT_SHA ?? 'unknown' },
  // Pages that run the engine are cross-origin isolated, so the
  // multi-threaded Stockfish build can use SharedArrayBuffer (P1-AN-13).
  // Only these routes: isolation blocks cross-origin embeds elsewhere.
  async headers() {
    const coep = { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' };
    const corp = { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' };
    const isolate = [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }, coep];
    return [
      { source: '/analysis/:path*', headers: isolate },
      { source: '/studies/:path*', headers: isolate },
      // Workers started by an isolated page (Stockfish, the PGN indexer)
      // load only when their own script carries COEP too.
      { source: '/engine/:path*', headers: [coep, corp] },
      { source: '/_next/static/:path*', headers: [coep, corp] },
    ];
  },
};

export default nextConfig;
