import { defineConfig } from 'vitest/config';
import { testDbUrl } from './packages/core/test/test-db.ts';

export default defineConfig({
  test: {
    include: ['{packages,apps,test}/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'apps/web/e2e/**'],
    env: { DATABASE_URL: testDbUrl },
    globalSetup: ['packages/core/test/global-setup.ts'],
    // ponytail: one shared test database, so files run one at a time.
    // Switch to a schema per file if the suite gets slow.
    fileParallelism: false,
  },
});
