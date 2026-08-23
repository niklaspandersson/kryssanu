import { test as setup, expect } from '@playwright/test';
import { TEST_USER } from './db';

const AUTH_FILE = 'e2e/.auth/user.json';

/**
 * Mint a session without Google OAuth.
 *
 * A setup project rather than a global setup: it runs after the webServer
 * entries are up (which minting a session requires) without depending on
 * Playwright's globalSetup ordering.
 */
setup('authenticate', async ({ request }) => {
  const res = await request.get('/api/auth/dev-login', {
    params: { email: TEST_USER.email },
  });

  // A 404 here means the fixture user is missing — run `npm run test:db:provision`.
  // Anything else usually means APP_ENV is 'production', which unregisters the route.
  expect(
    res.ok(),
    `dev-login failed (${res.status()}): ${await res.text()}`
  ).toBeTruthy();

  expect((await res.json()).email).toBe(TEST_USER.email);

  await request.storageState({ path: AUTH_FILE });
});
