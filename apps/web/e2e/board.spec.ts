// Chessboard acceptance criteria (p1-chessboard-component spec).
import { clickMove, drag, fen, moves } from './board';
import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/analysis');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
});

test('drag e2-e4 plays the move', async ({ page }) => {
  await drag(page, 'e2', 'e4');
  await expect(moves(page)).toContainText('e4');
  await expect(fen(page)).toContainText('4P3');
});

test('an illegal move snaps back and is not played', async ({ page }) => {
  await drag(page, 'e2', 'e5');
  await expect(page.getByText('No moves yet.')).toBeVisible();
  await expect(fen(page)).toHaveText('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
});

test('click-to-move works', async ({ page }) => {
  await clickMove(page, 'g1', 'f3');
  await expect(moves(page)).toContainText('Nf3');
});

test('promotion picker: promote to a knight', async ({ page }) => {
  await page.goto('/analysis/8/P6k/8/8/8/8/8/K7_w_-_-_0_1');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  await drag(page, 'a7', 'a8');
  await page.getByRole('button', { name: 'Promote to knight' }).click();
  await expect(moves(page)).toContainText('a8=N');
  await expect(fen(page)).toHaveText('N7/7k/8/8/8/8/8/K7 b - - 0 1');
});

test('cancelling promotion leaves the position unchanged', async ({ page }) => {
  await page.goto('/analysis/8/P6k/8/8/8/8/8/K7_w_-_-_0_1');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  await drag(page, 'a7', 'a8');
  await expect(page.getByRole('dialog', { name: 'Promote to' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Promote to' })).toBeHidden();
  await expect(page.getByText('No moves yet.')).toBeVisible();
});

test('an arrow survives export and re-import as [%cal]', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await drag(page, 'e2', 'e4');
  await expect(moves(page)).toContainText('e4');
  await drag(page, 'g1', 'f3', 'right');
  await expect(page.locator('.cg-shapes line, .cg-shapes path').first()).toBeAttached();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: 'Copy PGN' }).click();
  const pgn = await page.evaluate(() => navigator.clipboard.readText());
  expect(pgn).toContain('[%cal Gg1f3]');

  await page.goto('/analysis');
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('PGN or FEN').fill(pgn);
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(moves(page)).toContainText('e4');
  await page.keyboard.press('End');
  await expect(page.locator('.cg-shapes line, .cg-shapes path').first()).toBeAttached();
});

test('flip with the button and with f', async ({ page }) => {
  const board = page.getByTestId('board');
  await page.getByRole('button', { name: 'Flip board' }).click();
  await expect(board).toHaveClass(/orientation-black/);
  await page.keyboard.press('f');
  await expect(board).toHaveClass(/orientation-white/);
});

test('arrow keys walk the moves', async ({ page }) => {
  await drag(page, 'e2', 'e4');
  await expect(fen(page)).toContainText(' b ');
  await drag(page, 'e7', 'e5');
  await expect(moves(page)).toContainText('e5');
  await page.keyboard.press('ArrowLeft');
  await expect(fen(page)).toContainText('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b');
  await page.keyboard.press('Home');
  await expect(fen(page)).toContainText('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w');
  await page.keyboard.press('End');
  await expect(fen(page)).toContainText('4p3/4P3');
});

for (const width of [375, 1440]) {
  test(`at ${width}px the board is square with no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const box = (await page.getByTestId('board').boundingBox())!;
    expect(Math.abs(box.width - box.height)).toBeLessThan(1);
    expect(box.width).toBeGreaterThan(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('a bad FEN in the URL shows its reasons, not a crash (P1-PG-12)', async ({ page }) => {
  await page.goto('/analysis/8/8/8/8/8/8/8/8_w_-_-_0_1');
  await expect(page.getByRole('alert').filter({ hasText: "isn't valid" })).toContainText('The board is empty.');
});
