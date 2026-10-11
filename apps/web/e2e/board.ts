import type { Page } from '@playwright/test';

// Pixel center of a square, from the board's box and orientation.
export async function square(page: Page, name: string) {
  const board = page.getByTestId('board');
  const box = (await board.boundingBox())!;
  const black = await board.evaluate((el) => el.classList.contains('orientation-black'));
  const file = name.charCodeAt(0) - 97;
  const rank = Number(name[1]) - 1;
  const size = box.width / 8;
  const col = black ? 7 - file : file;
  const row = black ? rank : 7 - rank;
  return { x: box.x + (col + 0.5) * size, y: box.y + (row + 0.5) * size };
}

export async function drag(page: Page, from: string, to: string, button: 'left' | 'right' = 'left') {
  const a = await square(page, from);
  const b = await square(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down({ button });
  await page.mouse.move(b.x, b.y, { steps: 8 });
  // chessground starts a drag on an animation frame; a release before one has
  // run (a busy main thread) would count as a click.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.mouse.up({ button });
}

export async function clickMove(page: Page, from: string, to: string) {
  const a = await square(page, from);
  const b = await square(page, to);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
}

export const fen = (page: Page) => page.getByTestId('fen');
export const moves = (page: Page) => page.getByRole('tree', { name: 'Moves' });
