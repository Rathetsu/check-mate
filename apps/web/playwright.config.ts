import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

try {
  process.loadEnvFile(path.join(import.meta.dirname, '../../.env'));
} catch {}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  // PW_CHANNEL=chrome uses an installed Chrome when the Playwright download isn't available.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } }],
  webServer: {
    // CI tests the production build; locally the dev server is fine.
    command: process.env.CI ? `pnpm next start -p ${PORT}` : `pnpm next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: baseURL,
      SMTP_HOST: process.env.SMTP_HOST || '127.0.0.1', // Mailpit
      SMTP_PORT: process.env.SMTP_PORT || '1025',
    },
  },
});
