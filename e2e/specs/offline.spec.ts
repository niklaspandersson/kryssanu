import { test, expect, expectAuthenticated, BIRD } from '../fixtures';
import { createObservation, db, TEST_USER } from '../db';

/**
 * Offline behaviour — the area with the most recent regressions and the least
 * coverage.
 *
 * Two distinct paths flip the app offline, and they are not interchangeable:
 *
 *  1. The browser fires an `offline` event (context.setOffline).
 *  2. A request simply hangs with the interface still up. src/lib/api.ts aborts
 *     it after VITE_REQUEST_TIMEOUT_MS and calls markOffline(). This one is the
 *     regression fixed in e054dd4 — before that fix the app just sat there.
 *
 * Path 2 must be driven with a route handler that never fulfils. Using
 * setOffline for it would exercise path 1 and pass even with the fix reverted.
 *
 * The stall has to cover every /api route including /api/me: markOffline() starts
 * a 5s poll of /api/me and flips straight back online the moment a probe
 * succeeds, so a narrower pattern lets the app bounce back mid-assertion.
 */

test('a hung request flips the app into offline mode', async ({ page }) => {
  await page.goto('/summary');
  await expectAuthenticated(page);
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);

  // Never fulfilled, never aborted — the connection just hangs. No `offline`
  // event is fired, so only the request timeout can detect this.
  await page.route('**/api/**', () => {});

  await page.getByRole('link', { name: /Observationer/ }).first().click();

  // VITE_REQUEST_TIMEOUT_MS is 2000 under test (15000 in production).
  await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('offline-banner')).toContainText('Du är offline');
});

test('the browser offline event flips the app into offline mode', async ({ page, context }) => {
  await page.goto('/summary');
  await expectAuthenticated(page);

  await context.setOffline(true);

  await expect(page.getByTestId('offline-banner')).toBeVisible();

  await context.setOffline(false);
  // Recovery is driven by a 5s poll of /api/me, so allow for a full cycle.
  await expect(page.getByTestId('offline-banner')).toHaveCount(0, { timeout: 20_000 });
});

test('an observation logged offline queues and then syncs', async ({ page, context }) => {
  await page.goto('/birds');
  await expectAuthenticated(page);
  await expect(page.getByText('Laddar artlista...')).toHaveCount(0, { timeout: 30_000 });

  await context.setOffline(true);
  await expect(page.getByTestId('offline-banner')).toBeVisible();

  await page.getByRole('button', { name: `Kryssa ${BIRD.swedish}`, exact: true }).click();
  await page.getByPlaceholder('Plats (valfri)').fill('Utan täckning');
  await page.getByRole('button', { name: 'Kryssa!', exact: true }).click();

  // Queued in IndexedDB, surfaced on the banner — nothing reached the server yet.
  await expect(page.getByTestId('offline-banner')).toHaveAttribute('data-pending-count', '1');
  await expect(page.getByTestId('offline-banner')).toContainText('väntar på att synkas');
  expect(await db().observation.count({ where: { userId: TEST_USER.id } })).toBe(0);

  await context.setOffline(false);

  // startAutoSync() drains the queue on the `online` event.
  await expect
    .poll(() => db().observation.count({ where: { userId: TEST_USER.id } }), {
      timeout: 30_000,
    })
    .toBe(1);

  const synced = await db().observation.findFirst({ where: { userId: TEST_USER.id } });
  expect(synced?.birdId).toBe(BIRD.latin);
  // Deliberately not asserting listIds, images or coordinates here: the offline
  // queue drops them on capture and offlineSync.ts replays only
  // birdId/note/location/lat/lng. That is a known bug, not covered behaviour —
  // asserting on it either way would enshrine it.
});

/*
 * The two specs below navigate by clicking links rather than page.goto/reload.
 *
 * A full document load needs the network, and under `vite dev` there is no
 * service worker to serve the app shell from a precache (vite-plugin-pwa only
 * emits one for a production build). So an offline page.goto() fails with
 * ERR_INTERNET_DISCONNECTED before the app ever boots. Client-side routing is
 * also the realistic case: a user who loses signal mid-session keeps navigating
 * inside the app that is already running.
 */

test('a pending observation is shown while it waits to sync', async ({ page, context }) => {
  // Visit /summary while still online so its data is in the api cache. Reaching
  // a page for the first time while offline renders the AppShell ErrorBoundary
  // ("Kunde inte ladda sidan") instead of a degraded view — see the note at the
  // bottom of this file.
  await page.goto('/summary');
  await expectAuthenticated(page);

  await page.getByRole('link', { name: /Fåglar/ }).first().click();
  await expect(page.getByText('Laddar artlista...')).toHaveCount(0, { timeout: 30_000 });

  await context.setOffline(true);
  await page.getByRole('button', { name: `Kryssa ${BIRD.swedish}`, exact: true }).click();
  await page.getByRole('button', { name: 'Kryssa!', exact: true }).click();

  await page.getByRole('link', { name: /Hem/ }).first().click();
  await expect(page.getByText('Väntar på synk')).toBeVisible();
});

test('previously loaded data still renders while offline', async ({ page, context }) => {
  await createObservation({ birdId: BIRD.latin, location: 'Cachad plats' });

  await page.goto('/observations');
  await expectAuthenticated(page);
  await expect(page.getByTestId('observation-row')).toHaveCount(1);

  await context.setOffline(true);

  // Leave and come back: the refetch fails and has to fall back to the
  // IndexedDB api cache rather than rendering an error or an empty list.
  await page.getByRole('link', { name: /Hem/ }).first().click();
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await page.getByRole('link', { name: /Observationer/ }).first().click();

  await expect(page.getByTestId('observation-row')).toHaveCount(1);
  await expect(page.getByTestId('observation-row')).toContainText('Cachad plats');
});

/*
 * Known gap, deliberately not asserted here.
 *
 * Reaching a route for the first time while offline renders the AppShell
 * ErrorBoundary ("Kunde inte ladda sidan. Kontrollera din internetanslutning
 * och försök igen.") rather than a degraded page — there is nothing in the
 * IndexedDB api cache to fall back to, so the resource throws. The offline
 * banner and the pending-sync count still render correctly above it.
 *
 * That is pre-existing behaviour and the same family as the recent offline
 * fixes, so it is called out rather than encoded as expected. If it is ever
 * changed to degrade gracefully, this is the spec to extend.
 */
