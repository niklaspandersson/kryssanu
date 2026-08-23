import { test, expect, expectAuthenticated, BIRD } from '../fixtures';
import { createObservation, createList, db, TEST_USER } from '../db';

/**
 * The core loop: log a bird, then see it everywhere it should appear.
 *
 * Note on selectors: Material Icons are ligature icons and Icon.tsx renders the
 * icon name as the span's text, so an icon+text button's accessible name is
 * polluted ("edit Ändra", "addSkapa"). Swedish fragments are matched with
 * regexes throughout for that reason — never `exact: true` on a mixed button.
 */

async function waitForBirdList(page: import('@playwright/test').Page) {
  // The whole catalogue (928 taxa) loads into IndexedDB before any row renders.
  await expect(page.getByText('Laddar artlista...')).toHaveCount(0, {
    timeout: 30_000,
  });
}

test('logging a bird from the checklist creates an observation', async ({ page }) => {
  await page.goto('/birds');
  await expectAuthenticated(page);
  await waitForBirdList(page);

  const observe = page.getByRole('button', { name: `Kryssa ${BIRD.swedish}`, exact: true });
  await expect(observe).toHaveAttribute('aria-pressed', 'false');
  await observe.click();

  // The sheet's heading is the bird's Swedish name.
  await expect(page.getByRole('heading', { name: BIRD.swedish })).toBeVisible();

  await page.getByPlaceholder('Plats (valfri)').fill('Lidhemssjön');
  await page.getByPlaceholder('Anteckning (valfri)').fill('Två stycken vid foderbordet');
  await page.getByRole('button', { name: 'Kryssa!', exact: true }).click();

  // Optimistic tick on the checklist.
  await expect(observe).toHaveAttribute('aria-pressed', 'true');

  // And it really persisted.
  await expect
    .poll(() => db().observation.count({ where: { userId: TEST_USER.id } }))
    .toBe(1);

  const saved = await db().observation.findFirst({ where: { userId: TEST_USER.id } });
  expect(saved?.birdId).toBe(BIRD.latin);
  expect(saved?.location).toBe('Lidhemssjön');
  expect(saved?.note).toBe('Två stycken vid foderbordet');
});

test('a logged observation appears on the observations page', async ({ page }) => {
  await createObservation({ birdId: BIRD.latin, location: 'Domsand' });

  await page.goto('/observations');
  await expectAuthenticated(page);

  const row = page.getByTestId('observation-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(BIRD.swedish);
  await expect(row).toContainText('Domsand');
});

test('an observation can be edited', async ({ page }) => {
  await createObservation({ birdId: BIRD.latin, location: 'Fel plats' });

  await page.goto('/observations');
  await expectAuthenticated(page);

  const row = page.getByTestId('observation-row');
  await row.getByRole('button', { expanded: false }).click();

  await row.getByRole('button', { name: /Ändra/ }).click();
  await page.getByLabel('Plats').fill('Rätt plats');
  await page.getByRole('button', { name: /Spara/ }).click();

  await expect(page.getByRole('status')).toContainText('Observation uppdaterad');
  await expect
    .poll(async () => (await db().observation.findFirst())?.location)
    .toBe('Rätt plats');
});

test('an observation can be deleted', async ({ page }) => {
  await createObservation({ birdId: BIRD.latin });

  await page.goto('/observations');
  await expectAuthenticated(page);

  const row = page.getByTestId('observation-row');
  await row.getByRole('button', { expanded: false }).click();
  await row.getByRole('button', { name: /Ta bort/ }).click();

  // ConfirmDialog is the one overlay with a real dialog role.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Ta bort observation?');
  await dialog.getByRole('button', { name: /Ta bort/ }).click();

  await expect(page.getByTestId('observation-row')).toHaveCount(0);
  await expect.poll(() => db().observation.count()).toBe(0);
});

test('logging a bird increments the species stat', async ({ page }) => {
  const stat = page.getByTestId('stat-card').filter({ hasText: 'Arter totalt' });

  await page.goto('/summary');
  await expectAuthenticated(page);
  await expect(stat.getByTestId('stat-value')).toHaveText('0');

  await createObservation({ birdId: BIRD.latin });
  await page.reload();

  await expect(stat.getByTestId('stat-value')).toHaveText('1');
});

test('an observation can be filed under a list at log time', async ({ page }) => {
  const list = await createList({ name: 'Trädgården' });

  await page.goto('/birds');
  await expectAuthenticated(page);
  await waitForBirdList(page);

  await page.getByRole('button', { name: `Kryssa ${BIRD.swedish}`, exact: true }).click();
  await page.getByRole('button', { name: 'Trädgården', exact: true }).click();
  await page.getByRole('button', { name: 'Kryssa!', exact: true }).click();

  await expect
    .poll(() => db().observationList.count({ where: { listId: list.id } }))
    .toBe(1);
});
