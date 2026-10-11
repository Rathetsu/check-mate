// Studies 4.1 acceptance criteria (p1-studies spec).
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { drag, fen, moves } from './board';
import { expect, newUser, signUp, test } from './fixtures';

const TWO_GAMES = `[Event "Game A"]\n[White "Anna"]\n[Black "Ben"]\n\n1. e4 e5 2. Nf3 *\n\n[Event "Game B"]\n\n1. d4 d5 *\n`;

async function newStudy(page: Page, name: string) {
  await page.goto('/studies');
  await page.getByRole('button', { name: 'New study' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/studies\/[0-9a-f-]{36}\/[0-9a-f-]{36}/);
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  const [, id, chapterId] = /\/studies\/([^/]+)\/([^/#]+)/.exec(page.url())!;
  return { id: id!, chapterId: chapterId! };
}

async function addChapter(page: Page, tab: string, value: string, opts: { name?: string; mode?: string } = {}) {
  const before = page.url();
  await page.getByRole('button', { name: 'Add chapter' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add chapter' });
  if (opts.name) await dialog.getByLabel('Name').fill(opts.name);
  await dialog.getByRole('tab', { name: tab }).click();
  const field = { FEN: 'Position (FEN)', PGN: 'Games (PGN)', 'Lichess game': 'Lichess game link' }[tab];
  if (value && field) await dialog.getByLabel(field).fill(value);
  if (opts.mode) {
    await dialog.getByLabel('Mode').click();
    await page.getByRole('option', { name: opts.mode }).click();
  }
  await dialog.getByRole('button', { name: 'Add chapter' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(before); // the new chapter opens
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
}

const saved = (page: Page) => expect(page.getByTestId('save-state')).toHaveText('Saved');

test('create → blank + FEN + 2-game PGN → annotate → reload → all persists (spec flow)', async ({ page }) => {
  await signUp(page, newUser());
  const s = await newStudy(page, 'Openings');
  await addChapter(page, 'FEN', '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', { name: 'Pawn ending' });
  await addChapter(page, 'PGN', TWO_GAMES);
  await page.getByRole('tab', { name: 'Chapters' }).click();
  await expect(page.getByRole('list', { name: 'Chapters' }).getByRole('listitem')).toHaveText([
    /Chapter 1/,
    /Pawn ending/,
    /Anna - Ben/,
    /Game B/,
  ]);

  await page.getByRole('link', { name: 'Chapter 1' }).click();
  await expect(page).toHaveURL(new RegExp(`/studies/${s.id}/${s.chapterId}`));
  await drag(page, 'e2', 'e4');
  await expect(moves(page)).toContainText('e4');
  await page.getByRole('tab', { name: 'Annotate' }).click();
  await page.getByRole('button', { name: 'Brilliant move' }).click();
  await page.getByLabel('Comment on this move').fill('The best start.');
  await page.getByRole('tab', { name: 'Moves' }).click();
  await drag(page, 'g1', 'f3', 'right'); // an arrow
  await saved(page);

  await page.reload();
  await expect(moves(page)).toContainText('e4!!');
  await expect(moves(page)).toContainText('The best start.');
  await page.keyboard.press('End'); // the arrow is on 1. e4
  await expect(page.locator('.cg-shapes line, .cg-shapes path').first()).toBeAttached();
  await page.goto('/studies');
  await expect(page.getByRole('list', { name: 'Studies' })).toContainText('Openings');
  await expect(page.getByRole('list', { name: 'Studies' })).toContainText('4 chapters');
});

test('export the study → import it as a new study → identical chapters (P1-ST-08)', async ({ page }) => {
  await signUp(page, newUser());
  const a = await newStudy(page, 'Original');
  await addChapter(page, 'PGN', TWO_GAMES);
  const exported = await (await page.request.get(`/api/v1/studies/${a.id}/export.pgn`)).text();
  expect(exported).toContain('[StudyName "Original"]');

  const b = await newStudy(page, 'Copy');
  await addChapter(page, 'PGN', exported);
  const movetext = async (id: string) => {
    const study = await (await page.request.get(`/api/v1/studies/${id}`)).json();
    const pgns: string[] = [];
    for (const c of study.chapters) {
      const ch = await (await page.request.get(`/api/v1/studies/${id}/chapters/${c.id}`)).json();
      pgns.push(ch.pgn.split('\n\n').at(-1));
    }
    return pgns;
  };
  // b has its own blank chapter 1 plus the three imported ones.
  expect((await movetext(b.id)).slice(1)).toEqual(await movetext(a.id));
});

test('downloads: PGN, PNG and GIF are not empty (P1-ST-08)', async ({ page }) => {
  await signUp(page, newUser());
  await newStudy(page, 'Pictures');
  await drag(page, 'e2', 'e4');
  await saved(page);
  for (const item of ['Download chapter PGN', 'Download position as PNG', 'Download main line as GIF']) {
    await page.getByRole('button', { name: 'Share' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: item }).click(),
    ]);
    const size = readFileSync((await download.path())!).length;
    expect(size, item).toBeGreaterThan(100);
  }
});

test('an interactive lesson: wrong move, retry, right moves, the end (P1-ST-18)', async ({ page }) => {
  await signUp(page, newUser());
  await newStudy(page, 'Lessons');
  await addChapter(
    page,
    'PGN',
    '1. e4 { [%cm-deviation Start with the king pawn.] Well done. } e5 2. Nf3 { Develop! } *',
    {
      name: 'King pawn',
      mode: 'Interactive lesson',
    },
  );
  await page.getByRole('button', { name: 'Preview' }).click();
  const feedback = page.getByTestId('lesson-feedback');
  await expect(feedback).toHaveText('Your turn: find the best move for White.');
  await drag(page, 'd2', 'd4');
  await expect(feedback).toHaveText("That's not the move.");
  await expect(page.getByTestId('lesson')).toContainText('Start with the king pawn.');
  await page.getByRole('button', { name: 'Try again' }).click();
  await drag(page, 'e2', 'e4');
  await expect(feedback).toHaveText('Good move!');
  await expect(page.getByTestId('lesson')).toContainText('Well done.');
  await page.getByRole('button', { name: 'Next' }).click(); // Black's reply
  await expect(feedback).toHaveText('Your turn: find the best move for White.');
  await drag(page, 'g1', 'f3');
  await expect(feedback).toHaveText('Lesson complete.');
});

test('practice with the computer judges each move and replies (P1-ST-18)', async ({ page }) => {
  await signUp(page, newUser());
  const s = await newStudy(page, 'Practice');
  await addChapter(page, 'FEN', '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', { mode: 'Practice with computer' });
  await page.goto(`${page.url().split('#')[0]}?engine=fake&engineDelay=0`);
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByTestId('practice-status')).toHaveText('Your move as White.');
  await drag(page, 'e2', 'e4');
  await expect(page.getByTestId('practice-verdict')).toBeVisible();
  await expect(page.getByTestId('practice-status')).toHaveText('Your move as White.'); // the engine replied
  expect(s.id).toBeTruthy();
});

test('hide next moves: readers see moves only up to where they are (P1-ST-18)', async ({ page, another }) => {
  await signUp(page, newUser());
  const s = await newStudy(page, 'Secrets');
  await addChapter(page, 'PGN', '1. e4 e5 2. Nf3 Nc6 *', { name: 'Hidden', mode: 'Hide next moves' });
  const url = page.url();
  await page.request.patch(`/api/v1/studies/${s.id}`, { data: { visibility: 'unlisted' } });

  const reader = await another();
  await reader.goto(url);
  await expect(reader.getByTestId('board').locator('piece').first()).toBeVisible();
  await expect(moves(reader)).not.toContainText('e4');
  await reader.keyboard.press('ArrowRight');
  await reader.keyboard.press('ArrowRight');
  await expect(moves(reader)).toContainText('e5');
  await expect(moves(reader)).not.toContainText('Nf3');
  await expect(reader.getByRole('tab', { name: 'Annotate' })).toHaveCount(0); // read-only
});

test('analysis "Save to study" makes a new study with the line (P1-AN-22)', async ({ page }) => {
  await signUp(page, newUser());
  await page.goto('/analysis');
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  await drag(page, 'd2', 'd4');
  await expect(fen(page)).toContainText('3P4');
  await page.getByRole('button', { name: 'Save to study' }).click();
  await page.getByLabel('Study name').fill('From analysis');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\/studies\//);
  await expect(moves(page)).toContainText('d4');
});
