import { afterEach, expect, test, vi } from 'vitest';
import { sendEmail } from '../src/email.ts';

afterEach(() => vi.unstubAllEnvs());

test('without SMTP, sendEmail logs the link and does not throw (P1-AC-07)', async () => {
  vi.stubEnv('SMTP_HOST', '');
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  await expect(
    sendEmail({ to: 'a@example.com', subject: 'Verify', text: 'Verify: https://x/verify?t=1' }),
  ).resolves.toBeUndefined();
  expect(log.mock.calls.flat().join('\n')).toContain('https://x/verify?t=1');
  log.mockRestore();
});
