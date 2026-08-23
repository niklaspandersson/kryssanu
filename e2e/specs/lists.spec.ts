import { test, expect, expectAuthenticated, BIRD } from '../fixtures';
import { createList, createObservation, db } from '../db';

/**
 * Lists appear twice on this page: as cards in <main>, and in the sidebar's
 * "5 most recent lists" section. Every list assertion is scoped to <main> to
 * avoid a strict-mode violation between the two.
 */
const main = (page: import('@playwright/test').Page) => page.getByRole('main');

test('a list can be created', async ({ page }) => {
  await page.goto('/lists');
  await expectAuthenticated(page);

  await page.getByRole('button', { name: /Skapa/ }).click();

  // EditListSheet wraps its inputs in labels, so getByLabel works here.
  await page.getByLabel('Namn').fill('Vinterfåglar');
  await page.getByLabel('Beskrivning').fill('Vid foderbordet');
  await page.getByRole('button', { name: 'Skapa lista', exact: true }).click();

  await expect(main(page).getByRole('link', { name: /Vinterfåglar/ })).toBeVisible();
  await expect.poll(() => db().list.count()).toBe(1);
});

test('a list can be renamed', async ({ page }) => {
  await createList({ name: 'Gammalt namn' });

  await page.goto('/lists');
  await expectAuthenticated(page);

  // The icon ligature wins the accessible name here, so title is the way in.
  await page.getByTitle('Redigera lista').click();
  await page.getByLabel('Namn').fill('Nytt namn');
  await page.getByRole('button', { name: 'Spara ändringar', exact: true }).click();

  await expect(main(page).getByRole('link', { name: /Nytt namn/ })).toBeVisible();
  await expect.poll(async () => (await db().list.findFirst())?.name).toBe('Nytt namn');
});

test('a list can be deleted', async ({ page }) => {
  await createList({ name: 'Bort med den' });

  await page.goto('/lists');
  await expectAuthenticated(page);

  await page.getByTitle('Ta bort lista').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Ta bort lista?');
  await dialog.getByRole('button', { name: /Ta bort/ }).click();

  await expect(main(page).getByRole('link', { name: /Bort med den/ })).toHaveCount(0);
  await expect.poll(() => db().list.count()).toBe(0);
});

test('a list page shows only that list’s observations', async ({ page }) => {
  const list = await createList({ name: 'Utvalda' });
  const inList = await createObservation({ birdId: BIRD.latin, location: 'I listan' });
  await createObservation({ birdId: 'turdus merula', location: 'Utanför listan' });
  await db().observationList.create({
    data: { listId: list.id, observationId: inList.id },
  });

  await page.goto(`/observations/list/${list.id}`);
  await expectAuthenticated(page);

  await expect(page.getByTestId('observation-row')).toHaveCount(1);
  await expect(page.getByTestId('observation-row')).toContainText('I listan');
});
