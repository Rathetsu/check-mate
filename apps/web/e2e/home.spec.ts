import { expect, test } from './fixtures';

test('the hero replays its game, and Pause holds it (home-motion spec)', async ({ page }) => {
  await page.goto('/');
  const move = page.getByTestId('hero-move');
  await expect(move).toHaveText('17. Rd8# · Checkmate'); // the opening still
  await expect(move).toContainText('1. e4', { timeout: 10_000 });
  const pause = page.getByRole('button', { name: 'Pause motion' });
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  const held = await move.textContent();
  await page.waitForTimeout(2_500); // longer than a move
  await expect(move).toHaveText(held!);
});

test('reduced motion keeps the still, and a ticker opening opens on the board (home-motion spec)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // also stops the marquee, so the link holds still
  await page.goto('/');
  await expect(page.getByTestId('hero-move')).toHaveText('17. Rd8# · Checkmate');
  await expect(page.getByRole('button', { name: 'Pause motion' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Black: Sicilian Defense' }).click();
  await expect(page).toHaveURL(/\/analysis\//);
  await expect(page.getByTestId('opening')).toContainText('Sicilian Defense');
});
