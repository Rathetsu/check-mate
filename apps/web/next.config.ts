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
  transpilePackages: ['@checkmate/core'],
  // AGPL §13 Source link (P1-UI-08). Set at image build time.
  env: { NEXT_PUBLIC_COMMIT_SHA: process.env.COMMIT_SHA ?? 'unknown' },
};

export default nextConfig;
