// Tablebase acceptance criteria (P1-AN-50..52). Needs the `tablebase`
// compose service with at least the `ci` tables (scripts/fetch-tablebases.sh ci).
import { fen, moves } from './board';
import { expect, test } from './fixtures';

test('KRvK shows the result and every move’s outcome; a click plays it', async ({ page }) => {
  await page.goto('/analysis/4k3/8/8/8/8/8/8/R3K3_w_-_-_0_1');
  const panel = page.getByTestId('tablebase');
  await expect(panel.getByText('Tablebase', { exact: true })).toBeVisible();
  await expect(page.getByTestId('tablebase-result')).toContainText('White to move: Win');
  await expect(panel.getByRole('button')).not.toHaveCount(0);
  await panel.getByRole('button', { name: /^Ra7/ }).click();
  await expect(moves(page)).toContainText('Ra7');
  await expect(fen(page)).toHaveText('4k3/R7/8/8/8/8/8/4K3 b - - 1 1');
  await expect(page.getByTestId('tablebase-result')).toContainText('Black to move: Loss');
});

test('positions outside the tables show no section', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => r.url().includes('/api/v1/tablebase') && asked.push(r.url()));
  await page.goto('/analysis/4k3/8/8/8/8/8/PPP5/R3K3_w_-_-_0_1'); // 6 pieces
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('tablebase')).toHaveCount(0);
  expect(asked).toEqual([]);
});

test('the API answers 204 for positions it cannot cover', async ({ request }) => {
  const res = await request.get('/api/v1/tablebase?fen=4k3/8/8/8/8/8/PPP5/R3K3%20w%20-%20-%200%201');
  expect(res.status()).toBe(204); // 6 pieces
  expect((await request.get('/api/v1/tablebase?fen=nonsense')).status()).toBe(400);
});
