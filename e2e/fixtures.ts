import { test as base, expect, type Page } from '@playwright/test';
import { resetData } from './db';

/**
 * Stub the two third-party resources index.html pulls in.
 *
 * Neither is needed — the suite logs in via /api/auth/dev-login, not Google —
 * and both are slow and flaky in CI.
 *
 * They are fulfilled empty rather than aborted. index.html wires
 * `window.__googleGsiReady` to the GSI script's `onload`, and
 * `renderGoogleButton` awaits that promise; an aborted script never fires
 * onload, which left the logged-out pages hanging for ~13s each. An empty 200
 * resolves it immediately, and `window.google` stays undefined so
 * `renderGoogleButton` returns early.
 *
 * Exported because specs that build their own context (the logged-out cases)
 * do not go through the `page` fixture below.
 */
export async function stubThirdParty(page: Page): Promise<void> {
  await page.route(/accounts\.google\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
}

/** Keep persisted UI state from bleeding between tests. */
export async function seedLocalStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      // BirdsPage persists filter state; a leftover filter can hide the bird a
      // later test is looking for.
      window.localStorage.removeItem('mybirds-filters');
      // InstallPrompt's visibility is environment-dependent and it can sit over
      // content on /summary.
      window.localStorage.setItem('kryssanu-install-dismissed', '1');
    } catch {
      // Storage unavailable — nothing to clean.
    }
  });
}

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await resetData();
    await stubThirdParty(page);
    await seedLocalStorage(page);
    await use(page);
  },
});

export { expect };

/**
 * Wait until a protected route has actually rendered.
 *
 * `Protected` renders nothing at all while auth is loading and swaps in a login
 * gate if the session is bad — and a 401 anywhere makes src/lib/auth.tsx clear
 * its caches and hard-navigate to "/". Without this check that failure mode
 * shows up as a confusing assertion 20 lines later instead of here.
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page.getByText('Logga in för att fortsätta')).toHaveCount(0);
}

/** The bird every spec logs — a common Swedish species, stable in Sverigelistan. */
export const BIRD = {
  latin: 'parus major',
  swedish: 'talgoxe',
};
