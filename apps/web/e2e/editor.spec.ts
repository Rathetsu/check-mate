// Board editor acceptance criteria (p1-board-editor spec, M1.3).
import type { Page } from '@playwright/test';
import { drag, fen, square } from './board';
import { expect, test } from './fixtures';

const fenField = (page: Page) => page.getByLabel('FEN', { exact: true });
const problems = (page: Page) => page.getByRole('alert', { name: 'Problems with this position' });
const analyze = (page: Page) => page.getByRole('main').getByRole('link', { name: 'Analyze' });

async function clickSquare(page: Page, name: string) {
  const { x, y } = await square(page, name);
  await page.mouse.click(x, y);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/editor');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
});

test('clear → kings and a back-rank pawn is refused → fix it → Analyze opens the same FEN', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear board' }).click();
  await expect(problems(page)).toContainText('The board is empty.');

  await page.getByRole('toolbar', { name: 'White pieces' }).getByRole('button', { name: 'White king' }).click();
  await clickSquare(page, 'e1');
  await page.getByRole('toolbar', { name: 'Black pieces' }).getByRole('button', { name: 'Black king' }).click();
  await clickSquare(page, 'e8');
  await page.getByRole('toolbar', { name: 'White pieces' }).getByRole('button', { name: 'White pawn' }).click();
  await clickSquare(page, 'a8');
  await expect(problems(page)).toHaveText("Pawns can't stand on the first or last rank.");
  await expect(analyze(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Analyze' })).toBeDisabled();

  await page.getByRole('toolbar', { name: 'White pieces' }).getByRole('button', { name: 'Move pieces' }).click();
  await drag(page, 'a8', 'a7');
  await expect(problems(page)).toHaveCount(0);
  const editorFen = await fenField(page).inputValue();
  expect(editorFen).toBe('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  await expect(page).toHaveURL(/\/editor\/4k3\/P7\/8\/8\/8\/8\/8\/4K3_w_-_-_0_1$/);

  await analyze(page).click();
  await expect(page).toHaveURL(/\/analysis\//);
  await expect(fen(page)).toHaveText(editorFen);

  // Analysis → "Open in editor" keeps the FEN exactly (P1-AN-23, P1-ED-12).
  await page.getByRole('link', { name: 'Open in editor' }).click();
  await expect(fenField(page)).toHaveValue(editorFen);
});

test('a spare piece drags onto the board, and a piece dragged off it is deleted (P1-ED-01, P1-ED-02)', async ({
  page,
}) => {
  const knight = page.getByRole('toolbar', { name: 'White pieces' }).getByRole('button', { name: 'White knight' });
  const from = (await knight.boundingBox())!;
  const to = await square(page, 'e4');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await expect(fenField(page)).toHaveValue(/^rnbqkbnr\/pppppppp\/8\/8\/4N3\//);

  const a2 = await square(page, 'a2');
  const box = (await page.getByTestId('board').boundingBox())!;
  await page.mouse.move(a2.x, a2.y);
  await page.mouse.down();
  await page.mouse.move(box.x - 60, a2.y, { steps: 8 });
  await page.mouse.up();
  await expect(fenField(page)).toHaveValue(/\/1PPPPPPP\/RNBQKBNR /);
});

test('castling options follow the king and rooks (P1-ED-05)', async ({ page }) => {
  const shortWhite = page.getByRole('checkbox', { name: 'White O-O', exact: true });
  await expect(shortWhite).toBeChecked();
  await page.getByRole('toolbar', { name: 'White pieces' }).getByRole('button', { name: 'Eraser' }).click();
  await clickSquare(page, 'h1');
  await expect(shortWhite).toBeDisabled();
  await expect(shortWhite).not.toBeChecked();
  await expect(fenField(page)).toHaveValue(/ w Qkq - /);
  await page.getByRole('checkbox', { name: 'Black O-O-O' }).click();
  await expect(fenField(page)).toHaveValue(/ w Qk - /);
});

test('en passant lists only possible squares (P1-ED-06)', async ({ page }) => {
  await fenField(page).fill('4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1');
  await page.getByLabel('En passant').click();
  await expect(page.getByRole('option')).toHaveText(['None', 'd6']);
  await page.getByRole('option', { name: 'd6' }).click();
  await expect(fenField(page)).toHaveValue('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
});

test.describe('pasted FENs show their specific reasons (P1-ED-08, P1-ED-09)', () => {
  for (const [text, reason] of [
    ['8/8/8/8/8/8/8/4K3 w - - 0 1', 'Each side needs exactly one king.'] as const,
    ['4k3/8/8/8/8/8/8/4R1K1 w - - 0 1', "Black is in check but it isn't their move."] as const,
    ['P3k3/8/8/8/8/8/8/4K3 w - - 0 1', "Pawns can't stand on the first or last rank."] as const,
    ['4k3/pppppppp/p7/8/8/8/8/4K3 w - - 0 1', 'Black has too many pieces.'] as const,
  ])
    test(reason, async ({ page }) => {
      await fenField(page).fill(text);
      await expect(problems(page)).toContainText(reason);
      await expect(page.getByRole('button', { name: 'Analyze' })).toBeDisabled();
    });

  test('text that is not a FEN leaves the board unchanged', async ({ page }) => {
    await fenField(page).fill('hello');
    await expect(page.getByText("This isn't a valid FEN. The board wasn't changed.")).toBeVisible();
    await expect(analyze(page)).toBeVisible(); // still the starting position
  });
});

test('swap colors mirrors the position and flips the side to move (P1-ED-03)', async ({ page }) => {
  await fenField(page).fill('4k3/8/8/8/8/8/4P3/4K2R w K - 0 1');
  await page.getByRole('button', { name: 'Swap colors' }).click();
  await expect(fenField(page)).toHaveValue('4k2r/4p3/8/8/8/8/8/4K3 b k - 0 1');
});

test.describe('phones', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true });

  test('tap a palette piece, then tap squares to place it (P1-ED-13)', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear board' }).tap();
    await page.getByRole('toolbar', { name: 'White pieces' }).getByRole('button', { name: 'White rook' }).tap();
    for (const sq of ['a1', 'h1']) {
      const { x, y } = await square(page, sq);
      await page.touchscreen.tap(x, y);
    }
    await expect(fenField(page)).toHaveValue('8/8/8/8/8/8/8/R6R w - - 0 1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
