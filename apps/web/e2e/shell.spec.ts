import { expect, test } from './fixtures';

test('the footer Source link points at the deployed commit (P1-UI-08)', async ({ page }) => {
  await page.goto('/');
  const href = await page.getByTestId('source-link').getAttribute('href');
  const sha = process.env.COMMIT_SHA;
  expect(href).toContain('github.com/Rathetsu/check-mate');
  if (sha) expect(href).toBe(`https://github.com/Rathetsu/check-mate/tree/${sha}`);
  await expect(page.getByRole('link', { name: 'About & attributions' })).toBeVisible();
});

test('privacy is linked from the footer and the sign-up form (P1-UI-13)', async ({ page }) => {
  await page.goto('/auth/sign-up');
  await page.getByRole('link', { name: 'privacy page' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  await expect(page.getByText('Have I Been Pwned')).toBeVisible();
});

test('/about lists attributions from the register (P1-UI-08)', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('link', { name: 'chessground' })).toBeVisible();
  await expect(page.getByText(/Lichess puzzle CSV/)).toBeVisible();
});
