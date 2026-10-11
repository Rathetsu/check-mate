import { expect, newUser, signUp, test } from './fixtures';

test('preferences persist across reloads; signed-out visitors get defaults (P1-AC-09)', async ({ page, context }) => {
  await signUp(page, newUser());
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Board & sound' }).click();
  await page.getByLabel('Piece set').click();
  await page.getByRole('option', { name: 'Merida' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Board & sound' }).click();
  await expect(page.getByLabel('Piece set')).toHaveText('Merida');

  const res = await page.request.get('/api/v1/me/preferences');
  expect((await res.json()).pieceSet).toBe('merida');

  await context.clearCookies();
  const anon = await page.request.get('/api/v1/me/preferences');
  expect(anon.status()).toBe(401);
});

test('deleting the account signs out and removes it (P1-AC-10)', async ({ page }) => {
  const user = newUser();
  await signUp(page, user);
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Account' }).click();
  await page.getByLabel('Your password').fill(user.password);
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();

  const res = await page.request.post('/api/auth/sign-in/email', {
    data: { email: user.email, password: user.password },
  });
  expect(res.ok()).toBe(false);
});

test('API errors use the error envelope (CORE-41)', async ({ request }) => {
  const res = await request.get('/api/v1/me');
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: expect.any(String) } });
});
