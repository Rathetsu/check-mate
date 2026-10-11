// Studies 4.3 acceptance criteria (p1-studies spec): two browsers.
import { drag, fen, moves } from './board';
import { expect, newUser, signUp, test } from './fixtures';

test('invite → accept → live edits both ways → sync → viewer is read-only → reconnect catches up', async ({
  page,
  another,
}) => {
  test.setTimeout(90_000);
  const owner = newUser();
  const friend = newUser();
  await signUp(page, owner);
  const res = await page.request.post('/api/v1/studies', { data: { name: 'Team prep' } });
  const { id, chapterId } = (await res.json()) as { id: string; chapterId: string };
  const chapterUrl = `/studies/${id}/${chapterId}`;

  const other = await another();
  await signUp(other, friend);
  expect((await other.request.get(`/api/v1/studies/${id}`)).status()).toBe(404); // private

  // The owner invites by username; nothing is shared until it's accepted.
  await page.goto(chapterUrl);
  await page.getByRole('tab', { name: 'Study' }).click();
  await page.getByLabel('Username to invite').fill(friend.username);
  await page.getByRole('button', { name: 'Invite' }).click();
  await expect(page.getByTestId('members')).toContainText(`${friend.username} (invited)`);
  expect((await other.request.get(`/api/v1/studies/${id}`)).status()).toBe(404);

  await other.goto('/studies?tab=invites');
  await other.getByRole('list', { name: 'Invitations' }).getByRole('button', { name: 'Accept' }).click();
  await expect(other).toHaveURL(new RegExp(chapterUrl));
  await expect(other.getByTestId('board').locator('piece').first()).toBeVisible();

  // Live edits, both ways.
  await page.reload();
  await expect(page.getByTestId('board').locator('piece').first()).toBeVisible();
  await drag(page, 'e2', 'e4');
  await expect(moves(other)).toContainText('e4');
  await other.keyboard.press('End');
  await drag(other, 'e7', 'e5');
  await expect(moves(page)).toContainText('e5');
  await other.getByRole('tab', { name: 'Annotate' }).click();
  await other.getByLabel('Comment on this move').fill('Symmetry.');
  await other.getByRole('tab', { name: 'Moves' }).click();
  await expect(moves(page)).toContainText('Symmetry.');

  // Sync: each follows where the other goes; the last move through the tree wins.
  await expect(fen(page)).toContainText('/4p3/'); // the owner followed the friend to 1... e5
  await page.keyboard.press('Home');
  await expect(fen(other)).toHaveText(defaultFen);

  // Demoted to viewer: their open page turns read-only.
  await page.getByRole('tab', { name: 'Study' }).click();
  await page.getByLabel(`Role of ${friend.username}`).click();
  await page.getByRole('option', { name: 'Viewer' }).click();
  await expect(other.getByRole('tab', { name: 'Annotate' })).toHaveCount(0);

  // Their stream was closed and reopened; edits made meanwhile still arrive.
  await page.keyboard.press('End');
  await drag(page, 'g1', 'f3');
  await expect(moves(other)).toContainText('Nf3');
  const op = await other.request.post(`/api/v1/studies/${id}/chapters/${chapterId}/ops`, {
    data: { op: { op: 'clearAnnotations' } },
  });
  expect(op.status()).toBe(403);
});

const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
