// Accounts spec acceptance criteria (M1.0 done-when): register/sign-in, plus
// verification and reset through Mailpit.
import { expect, mailLink, newUser, signIn, signUp, test } from './fixtures';

test('register → use the app unverified → verify → sign out → reset → old sessions revoked → new password works', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000); // two sign-ups' breach checks plus email round trips
  const user = newUser();
  await signUp(page, user);

  // Saving works before verifying (P1-AC-02).
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Appearance' }).click();
  await page.getByLabel('Theme').click();
  await page.getByRole('option', { name: 'Dark' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  // A second device, signed in, must be signed out by the reset.
  const other = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': '10.250.0.1' } });
  const otherPage = await other.newPage();
  await signIn(otherPage, user.email, user.password);

  // Verify through the emailed link.
  await page.goto(await mailLink(user.email, 'Verify'));
  await page.goto('/settings');
  await expect(page.getByText('Verified.')).toBeVisible();

  // Sign out, then reset the password.
  await page.getByRole('button', { name: 'Account menu' }).first().click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();

  await page.goto('/auth/forgot-password');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('a reset link is on its way')).toBeVisible();

  const newPassword = `${user.password}-new`;
  await page.goto(await mailLink(user.email, 'Reset'));
  await page.getByLabel('New password').fill(newPassword);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in\?reset=1/);

  // The other device's session was revoked (P1-AC-03, P1-AC-04).
  await otherPage.goto('/settings');
  await expect(otherPage).toHaveURL(/\/auth\/sign-in/);
  await other.close();

  await signIn(page, user.username, newPassword); // username sign-in works too
});

test('the same username in different case is rejected (P1-AC-01)', async ({ page, context }) => {
  const user = newUser();
  await signUp(page, user);
  await context.clearCookies();

  const clash = { ...newUser(), username: user.username.toUpperCase() };
  await page.goto('/auth/sign-up');
  await page.getByLabel('Username').fill(clash.username);
  await page.getByLabel('Display name').fill(clash.name);
  await page.getByLabel('Email').fill(clash.email);
  await page.getByLabel('Password').fill(clash.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(/username is already taken/i)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-up/);
});

test('sign-in is rate limited: 20 attempts in a minute get a 429 (P1-AC-05)', async ({ request, ip }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 20; i++) {
    const res = await request.post('/api/auth/sign-in/email', {
      headers: { 'x-forwarded-for': ip },
      data: { email: 'nobody@example.com', password: 'wrong-password-123' },
    });
    statuses.push(res.status());
  }
  expect(statuses).toContain(429);
});
