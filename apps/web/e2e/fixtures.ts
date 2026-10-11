import { randomInt, randomUUID } from 'node:crypto';
import { defaultPreferences } from '@checkmate/core/shared';
import { test as base, expect, type Page } from '@playwright/test';

export { expect };

const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';

// Each test looks like its own client IP, so Better Auth's per-IP rate
// limits (on in every environment, P1-AC-05) don't leak between tests.
// The engine starts off for signed-out visitors unless a test opts in with
// `test.use({ engine: true })`, so parallel tests don't fight over CPU.
export const test = base.extend<{ ip: string; engine: boolean; engineDefault: void }>({
  engine: [false, { option: true }],
  engineDefault: [
    async ({ context, engine }, use) => {
      if (!engine)
        await context.addInitScript(
          (prefs) => {
            if (!localStorage.getItem('checkmate:prefs'))
              localStorage.setItem('checkmate:prefs', JSON.stringify(prefs));
          },
          { ...defaultPreferences, engineEnabled: false },
        );
      await use();
    },
    { auto: true },
  ],
  ip: [
    async ({ context }, use) => {
      const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
      await context.setExtraHTTPHeaders({ 'x-forwarded-for': ip });
      await use(ip);
    },
    { auto: true },
  ],
});

export function newUser() {
  const id = randomUUID().slice(0, 8);
  return {
    username: `Player_${id}`,
    name: `Player ${id}`,
    email: `player-${id}@example.com`,
    password: `Kx9-${randomUUID()}`,
  };
}
export type User = ReturnType<typeof newUser>;

export async function signUp(page: Page, user: User) {
  await page.goto('/auth/sign-up');
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Display name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/', { timeout: 15_000 }); // includes the breach check over the network
  await expect(page.getByRole('button', { name: 'Account menu' }).first()).toBeVisible();
  // Like signed-out pages, new accounts start with the engine off in tests.
  const res = await page.request.put('/api/v1/me/preferences', {
    data: { ...defaultPreferences, engineEnabled: false },
  });
  expect(res.ok()).toBe(true);
}

export async function signIn(page: Page, login: string, password: string) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email or username').fill(login);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

// The newest email to `to` whose subject contains `subject`, as its first link.
export async function mailLink(to: string, subject: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}" subject:"${subject}"`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`)).json()) as { Text: string };
      const url = msg.Text.match(/https?:\/\/\S+/)?.[0];
      if (url) return url;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No "${subject}" email for ${to}`);
}
