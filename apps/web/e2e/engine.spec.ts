// Engine acceptance criteria (p1-analysis-board spec, P1-AN-10..17).
import { applyUci, validateSetup } from '@checkmate/chess';
import { fen, moves } from './board';
import { expect, test } from './fixtures';

test.use({ engine: true });

// Two threads at most, so parallel tests don't starve each other.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('checkmate:engine', JSON.stringify({ threads: 2 })));
});

const evalText = (page: import('@playwright/test').Page) => page.getByTestId('engine-eval');
const lines = (page: import('@playwright/test').Page) => page.getByTestId('engine-lines').locator('li');

// Is this engine line legal in the position the board shows right now?
async function lineFitsBoard(page: import('@playwright/test').Page) {
  const pv = await lines(page)
    .first()
    .getAttribute('data-pv', { timeout: 100 })
    .catch(() => null);
  if (!pv) return true; // no line shown is fine; a stale one is not
  const pos = validateSetup((await fen(page).textContent())!);
  return pos.ok && applyUci(pos.pos, pv.split(' ')[0]!) !== undefined;
}

test('the real engine evaluates within 2 s, and a PV click plays the line (P1-AN-11, P1-AN-12)', async ({ page }) => {
  await page.goto('/analysis');
  // The 2 s budget starts once the engine has loaded (a one-time download).
  await expect(page.getByTestId('engine-provenance')).not.toHaveText(/Loading|Downloading/, { timeout: 15_000 });
  await expect(evalText(page)).toHaveText(/^[+-]?\d+\.\d|^#/, { timeout: 2_000 });
  await expect(page.getByTestId('engine-provenance')).toContainText('Stockfish 19 Lite');
  // Read and click in one step: the line can change at the next depth.
  const san = await lines(page)
    .first()
    .getByRole('button')
    .first()
    .evaluate((el: HTMLElement) => (el.click(), el.textContent!));
  await expect(moves(page).locator('[aria-current="true"]')).toHaveText(san);
});

test('the page is cross-origin isolated and uses the multi-threaded build', async ({ page }) => {
  await page.goto('/analysis');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await expect(page.getByTestId('engine-provenance')).toContainText('Multithreaded', { timeout: 10_000 });
});

test('without isolation the single-threaded engine still works (P1-AN-17)', async ({ page }) => {
  await page.route('**/analysis', async (route) => {
    const res = await route.fetch();
    const headers = { ...res.headers() };
    // The fetched body is already decoded, so its length and encoding go too.
    for (const h of [
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'content-length',
      'content-encoding',
    ])
      delete headers[h];
    await route.fulfill({ response: res, headers });
  });
  await page.goto('/analysis');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(false);
  await expect(evalText(page)).toHaveText(/^[+-]?\d+\.\d|^#/, { timeout: 10_000 });
  await expect(page.getByTestId('engine-provenance')).not.toContainText('Multithreaded');
});

test('the fake provider renders the same panel (CORE-23)', async ({ page }) => {
  await page.goto('/analysis?engine=fake&engineDelay=10');
  await expect(page.getByTestId('engine-provenance')).toContainText('Fake engine');
  await expect(evalText(page)).toHaveText('+0.3');
  await expect(lines(page)).toHaveCount(1);
});

test('rapid navigation never shows a stale eval (P1-AN-16)', async ({ page }) => {
  await page.goto('/analysis?engine=fake&engineDelay=150');
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('PGN or FEN').fill('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *');
  await page.getByRole('button', { name: 'Load' }).click();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press(i % 3 === 2 ? 'ArrowLeft' : 'ArrowRight');
    expect(await lineFitsBoard(page)).toBe(true);
  }
  await expect(lines(page)).toHaveCount(1);
  expect(await lineFitsBoard(page)).toBe(true);
});

test('x toggles the engine; it never runs when switched off (P1-AN-10)', async ({ page }) => {
  await page.goto('/analysis?engine=fake&engineDelay=10');
  await expect(lines(page)).toHaveCount(1);
  await page.keyboard.press('x');
  await expect(lines(page)).toHaveCount(0);
  await expect(page.getByTestId('engine-provenance')).toHaveText('Press x to start the engine');
});

// The acceptance criterion is 60 s; CI runs 10 s. LONGTASK_SECONDS=60 for the full run.
test('long tasks stay under 50 ms while the engine runs at depth ∞', async ({ page }) => {
  const seconds = Number(process.env.LONGTASK_SECONDS ?? 10);
  test.setTimeout((seconds + 30) * 1000);
  await page.goto('/analysis');
  await expect(evalText(page)).toHaveText(/\d/, { timeout: 10_000 });
  const longest = await page.evaluate(
    (ms) =>
      new Promise<number>((done) => {
        let max = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) max = Math.max(max, e.duration);
        }).observe({ type: 'longtask' });
        setTimeout(() => done(max), ms);
      }),
    seconds * 1000,
  );
  expect(longest).toBeLessThan(50);
});
