import {
  test,
  expect,
  expectAuthenticated,
  stubThirdParty,
  seedLocalStorage,
} from '../fixtures';

test('the public home page renders without a session', async ({ browser }) => {
  // A context with no storageState — the logged-out case.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await stubThirdParty(page);
  await seedLocalStorage(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'kryssa.nu' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sök fåglar/ })).toBeVisible();

  await context.close();
});

test('a protected route shows the login gate without a session', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await stubThirdParty(page);
  await seedLocalStorage(page);
  await page.goto('/observations');

  // Protected renders nothing while auth is loading, so wait for the gate itself
  // rather than asserting on an absence.
  await expect(page.getByText('Logga in för att fortsätta')).toBeVisible();

  await context.close();
});

test('the authenticated fixture reaches the summary page', async ({ page }) => {
  await page.goto('/summary');

  await expectAuthenticated(page);
  await expect(page.getByTestId('stat-card').first()).toBeVisible();
});

test('the side navigation reaches the main sections', async ({ page }) => {
  await page.goto('/summary');
  await expectAuthenticated(page);

  // Desktop viewport keeps the sidebar permanently visible, so no menu button.
  await page.getByRole('link', { name: /Observationer/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Mina observationer' })).toBeVisible();

  await page.getByRole('link', { name: /Listor/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Listor' })).toBeVisible();
});
