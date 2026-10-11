// PGN/FEN acceptance criteria (p1-pgn-fen spec).
import { readFileSync } from 'node:fs';
import { loadGame, makePgn } from '@checkmate/chess';
import { fen, moves } from './board';
import { expect, test } from './fixtures';

const fixture = (name: string) =>
  readFileSync(new URL(`../../../packages/chess/fixtures/${name}`, import.meta.url), 'utf8');

async function importText(page: import('@playwright/test').Page, text: string) {
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('PGN or FEN').fill(text);
  await page.getByRole('button', { name: 'Load' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/analysis');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
});

test('a multi-game PGN shows a picker (P1-AN-20)', async ({ page }) => {
  await importText(page, fixture('chesscom-archive.pgn'));
  const list = page.getByRole('list', { name: 'Games in this PGN' });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await list.getByRole('button').nth(1).click();
  await expect(moves(page)).toContainText('1.');
});

test('a broken game shows its error and line; the others still open (P1-PG-03, P1-PG-04)', async ({ page }) => {
  await importText(page, `${fixture('malformed/illegal-move.pgn')}\n${fixture('lichess-study.pgn')}`);
  await expect(page.getByText('Line 7: Move 9. Nxd6 is illegal in this position.')).toBeVisible();
  await page.getByRole('button', { name: /Italian ideas: Main line/ }).click();
  await expect(moves(page)).toContainText('Bc4');
});

test('a FEN loads as a position', async ({ page }) => {
  await importText(page, '8/P6k/8/8/8/8/8/K7 w - - 0 1');
  await expect(fen(page)).toHaveText('8/P6k/8/8/8/8/8/K7 w - - 0 1');
});

test('an invalid FEN names its problems', async ({ page }) => {
  await importText(page, '8/8/8/8/8/8/8/8 w - - 0 1');
  await expect(page.getByRole('alert').filter({ hasText: 'empty' })).toBeVisible();
});

test('export matches the library output for the same game (P1-PG-22)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const study = fixture('lichess-study.pgn');
  await importText(page, study);
  await page.getByRole('button', { name: /Main line/ }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: 'Copy PGN' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const expected = loadGame(study);
  expect(expected.ok && copied).toBe(expected.ok && makePgn(expected.cursor));
});

test('a 5 MB, 3,000-game file lists in under 3 s with no long main-thread task over 200 ms (P1-PG-02)', async ({
  page,
}) => {
  const big = fixture('chesscom-archive.pgn').repeat(1000) + fixture('lichess-broadcast.pgn').repeat(12);
  expect(big.length).toBeGreaterThan(5_000_000);
  await page.getByRole('button', { name: 'Import' }).click();
  // Handing 5 MB to the page is itself a long task in the test driver, so the
  // file is built first and the observer starts after.
  await page.evaluate((text) => {
    (window as unknown as { big: File }).big = new File([text], 'big.pgn');
  }, big);
  await page.evaluate(() => {
    (window as unknown as { longest: number }).longest = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const w = window as unknown as { longest: number };
        w.longest = Math.max(w.longest, e.duration);
      }
    }).observe({ type: 'longtask' });
  });
  const started = Date.now();
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    const files = new DataTransfer();
    files.items.add((window as unknown as { big: File }).big);
    input.files = files.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByRole('status').filter({ hasText: 'games. Pick one' })).toContainText('3,048 games');
  const elapsed = Date.now() - started;
  const longest = await page.evaluate(() => (window as unknown as { longest: number }).longest);
  console.info(`[perf] listed 3,048 games in ${elapsed} ms; longest main-thread task ${Math.round(longest)} ms`);
  expect(elapsed).toBeLessThan(3_000);
  expect(longest).toBeLessThan(200);
});
