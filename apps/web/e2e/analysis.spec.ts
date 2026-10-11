// Analysis board acceptance criteria (p1-analysis-board spec, M1.2).
import { drag, fen, moves } from './board';
import { expect, newUser, signUp, test } from './fixtures';

async function importPgn(page: import('@playwright/test').Page, pgn: string) {
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('PGN or FEN').fill(pgn);
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

// The real clipboard needs page focus, which parallel tests can't all have.
const clipboard = (page: import('@playwright/test').Page) =>
  page
    .waitForFunction(() => (window as unknown as { __clip?: string }).__clip)
    .then((h) => h.jsonValue() as Promise<string>);

async function exportPgn(page: import('@playwright/test').Page) {
  await page.evaluate(() => delete (window as unknown as { __clip?: string }).__clip);
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: 'Copy PGN' }).click();
  return clipboard(page);
}

test.beforeEach(async ({ page, context }) => {
  await context.addInitScript(() => {
    navigator.clipboard.writeText = async (text: string) =>
      void ((window as unknown as { __clip?: string }).__clip = text);
  });
  await page.goto('/analysis');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
});

test('keys walk the tree; promoting a variation changes the export (P1-AN-01..03)', async ({ page }) => {
  await importPgn(page, '1. e4 e5 2. Nf3 ( 2. Bc4 Nf6 ) 2... Nc6 *');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown'); // Nf3 → its sibling Bc4
  await expect(moves(page).locator('[aria-current="true"]')).toHaveText('Bc4');
  await moves(page).locator('[aria-current="true"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Make mainline' }).click();
  expect(await exportPgn(page)).toContain('1. e4 e5 2. Bc4 ( 2. Nf3 Nc6 ) 2... Nf6 *');

  await moves(page).getByRole('button', { name: 'Nf6' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete from here' }).click();
  expect(await exportPgn(page)).toContain('1. e4 e5 2. Bc4 ( 2. Nf3 Nc6 ) *');
});

test('glyphs and comments show in the move list and export (P1-AN-04)', async ({ page }) => {
  await drag(page, 'e2', 'e4');
  await expect(moves(page)).toContainText('e4');
  await page.getByRole('tab', { name: 'Annotate' }).click();
  await page.getByRole('button', { name: 'Good move' }).click();
  await page.getByRole('button', { name: 'White is slightly better' }).click();
  await page.getByLabel('Comment on this move').fill('Best by test.');
  await page.getByRole('tab', { name: 'Moves' }).click(); // blur saves the comment
  await expect(moves(page)).toContainText('e4!⩲');
  await expect(moves(page)).toContainText('Best by test.');
  expect(await exportPgn(page)).toContain('1. e4 $1 $14 { Best by test. } *');
});

test('the opening name follows the line, and nothing is shown when unnamed (P1-AN-07)', async ({ page }) => {
  await expect(page.getByTestId('opening')).toHaveText('');
  await importPgn(page, '1. e4 e5 2. Nf3 Nc6 3. Bc4 *');
  await page.keyboard.press('End');
  await expect(page.getByTestId('opening')).toHaveText('C50 Italian Game');
});

test('game status comes from the rules layer (P1-AN-06)', async ({ page }) => {
  await importPgn(page, '1. f3 e5 2. g4 Qh4# 0-1');
  await page.keyboard.press('End');
  await expect(page.getByTestId('game-status')).toHaveText('Checkmate. Black wins.');
});

test('the command palette runs page actions and opens pages (P1-UI-04)', async ({ page }) => {
  await page.keyboard.press('/');
  await page.getByRole('option', { name: 'Flip board' }).click();
  await expect(page.getByTestId('board')).toHaveClass(/orientation-black/);
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('/');
  await page.getByPlaceholder('Type a command or a page…').fill('import');
  await page.getByRole('option', { name: 'Import a PGN or FEN' }).click();
  await expect(page.getByLabel('PGN or FEN')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});

test('a full-analysis link opens the same tree (P1-AN-21)', async ({ page }) => {
  await importPgn(page, '1. e4 { King pawn } e5 ( 1... c5 ) 2. Nf3 *');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: 'Copy link to the whole analysis' }).click();
  const link = await clipboard(page);
  expect(link).toMatch(/\/analysis#pgn=[\w-]+$/);
  await page.goto('about:blank');
  await page.goto(link);
  await expect(moves(page)).toContainText('King pawn');
  await expect(moves(page)).toContainText('c5');
  await expect(page).toHaveURL(/\/analysis$/); // the hash is consumed
});

test('a link over the cap is never offered; the message offers the position link', async ({ page }) => {
  let seed = 7;
  const noise = Array.from({ length: 14_000 }, () => ((seed = (seed * 48271) % 2147483647) % 36).toString(36)).join('');
  await importPgn(page, `1. e4 { ${noise} } *`);
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: 'Copy link to the whole analysis' }).click();
  const dialog = page.getByRole('dialog', { name: 'This analysis is too big to fit in a link' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Copy position link' }).click();
  expect(await clipboard(page)).toMatch(/\/analysis\/rnbqkbnr\/.*_w_KQkq_-_0_1$/);
});

test('a signed-in analysis autosaves and resumes after a reload (P1-AN-31, P1-AN-33)', async ({ page }) => {
  await signUp(page, newUser());
  await page.goto('/analysis');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  await drag(page, 'e2', 'e4');
  await expect(moves(page)).toContainText('e4');
  await drag(page, 'e7', 'e5');
  await expect(fen(page)).toContainText('4p3');
  await expect(page).toHaveURL(/\/analysis\?session=[0-9a-f-]{36}$/, { timeout: 15_000 });
  await page.reload();
  await expect(moves(page)).toContainText('e5');
  await expect(fen(page)).toContainText('4p3'); // resumed on the last move
  await page.goto('/');
  await page.getByRole('link', { name: 'Continue your last analysis' }).click();
  await expect(moves(page)).toContainText('e5');
});

test('an anonymous visitor never creates a session', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (r) => r.url().includes('/api/v1/analysis-sessions') && posts.push(r.url()));
  await drag(page, 'e2', 'e4');
  await expect(moves(page)).toContainText('e4');
  await page.waitForTimeout(6_000);
  expect(posts).toEqual([]);
});
