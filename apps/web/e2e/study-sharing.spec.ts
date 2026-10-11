// Studies 4.2 acceptance criteria (p1-studies spec): publish, read signed
// out, embed, browse.
import { defaultPreferences } from '@checkmate/core/shared';
import type { Browser, Page } from '@playwright/test';
import { drag, moves } from './board';
import { expect, newUser, signUp, test } from './fixtures';

async function newStudy(page: Page, name: string) {
  const res = await page.request.post('/api/v1/studies', { data: { name } });
  expect(res.status()).toBe(201);
  const { id, chapterId } = (await res.json()) as { id: string; chapterId: string };
  await page.goto(`/studies/${id}/${chapterId}`);
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  return { id, chapterId };
}

async function signedOut(browser: Browser) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((p) => localStorage.setItem('checkmate:prefs', JSON.stringify(p)), {
    ...defaultPreferences,
    engineEnabled: false,
  });
  return ctx.newPage();
}

test('publish a study → a signed-out visitor reads it, read-only (P1-ST-11, P1-ST-23)', async ({ page, browser }) => {
  await signUp(page, newUser());
  const s = await newStudy(page, 'Shared openings');
  await drag(page, 'e2', 'e4');
  await expect(page.getByTestId('save-state')).toHaveText('Saved');

  const visitor = await signedOut(browser);
  await visitor.goto(`/studies/${s.id}/${s.chapterId}`);
  await expect(visitor.getByRole('heading', { name: 'Page not found' })).toBeVisible(); // private: a 404

  await page.getByRole('button', { name: 'Study settings' }).click();
  await page.getByLabel('Who can see it').click();
  await page.getByRole('option', { name: 'Everyone (listed in public studies)' }).click();
  await page.getByLabel('Topics').fill('Kings pawn, openings');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('link', { name: 'openings' })).toBeVisible();

  await visitor.goto(`/studies/${s.id}/${s.chapterId}`);
  await expect(moves(visitor)).toContainText('e4');
  await expect(visitor.getByRole('tab', { name: 'Annotate' })).toHaveCount(0);
  await expect(visitor.getByTestId('save-state')).toHaveCount(0);
});

test('embed: framable anywhere, every other page only by us (P1-ST-24)', async ({ page, request }) => {
  await signUp(page, newUser());
  const s = await newStudy(page, 'Embedded');
  const embed = `/embed/study/${s.id}/${s.chapterId}`;
  expect((await request.get(embed)).status()).toBe(404); // private studies don't embed
  await page.request.patch(`/api/v1/studies/${s.id}`, { data: { visibility: 'unlisted' } });

  const res = await request.get(embed);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-security-policy']).toBe('frame-ancestors *');
  expect(res.headers()['cross-origin-embedder-policy']).toBeUndefined();
  for (const path of ['/', '/settings', `/studies/${s.id}/${s.chapterId}`])
    expect((await request.get(path)).headers()['content-security-policy'], path).toBe("frame-ancestors 'self'");

  await page.goto(embed);
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0); // no site chrome
  await expect(page.getByRole('region', { name: 'Engine' })).toHaveCount(0);
});

test('browse: public list, search, likes, topic pages and clone (P1-ST-20..22)', async ({ page, browser }) => {
  await signUp(page, newUser());
  const tag = `topic-${Date.now()}`;
  const s = await newStudy(page, `Browse me ${tag}`);
  await page.request.patch(`/api/v1/studies/${s.id}`, { data: { visibility: 'public', topics: [tag] } });

  const visitor = await signedOut(browser);
  await visitor.goto('/studies');
  await expect(visitor.getByRole('link', { name: 'Public' })).toHaveAttribute('aria-current', 'page');
  await visitor.getByLabel('Search studies').fill(tag);
  await visitor.getByRole('button', { name: 'Search' }).click();
  await expect(visitor.getByRole('list', { name: 'Studies' }).getByRole('listitem')).toHaveCount(1);
  await visitor.getByRole('link', { name: tag, exact: true }).click();
  await expect(visitor).toHaveURL(new RegExp(`/studies/topic/${tag}$`));
  await expect(visitor.getByRole('heading', { name: `Studies about ${tag}` })).toBeVisible();
  await expect(visitor.getByRole('list', { name: 'Studies' })).toContainText(`Browse me ${tag}`);

  // A second account likes and clones it.
  const fan = await (await browser.newContext()).newPage();
  await signUp(fan, newUser());
  await fan.goto(`/studies/${s.id}/${s.chapterId}`);
  await fan.getByRole('button', { name: 'Like' }).click();
  await expect(fan.getByRole('button', { name: 'Unlike' })).toContainText('1');
  await fan.getByRole('button', { name: 'Clone' }).click();
  await expect(fan).not.toHaveURL(new RegExp(s.id)); // the copy opens
  await expect(fan.getByRole('heading', { name: `Browse me ${tag}` })).toBeVisible();
  await fan.goto('/studies?tab=liked');
  await expect(fan.getByRole('list', { name: 'Studies' })).toContainText(`Browse me ${tag}`);
});
