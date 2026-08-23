import { test, expect, expectAuthenticated, BIRD } from '../fixtures';
import { createObservation, db, TEST_USER, OTHER_USER } from '../db';

/** `datetime-local` inputs want `YYYY-MM-DDTHH:mm`. */
function localDateTime(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

test('an event can be created', async ({ page }) => {
  await page.goto('/events/new');
  await expectAuthenticated(page);

  // CreateEventPage wraps every field in a label — the cleanest form in the app.
  await page.getByLabel(/Namn/).fill('Vårkryss 2026');
  await page.getByLabel(/Beskrivning/).fill('Vi kryssar tillsammans');
  await page.getByLabel(/Startar/).fill(localDateTime(-1));
  await page.getByLabel(/Slutar/).fill(localDateTime(1));

  const submit = page.getByRole('button', { name: 'Skapa event', exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();

  // Navigates to the new event on success.
  await expect(page).toHaveURL(/\/events\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Vårkryss 2026' })).toBeVisible();
  await expect.poll(() => db().event.count()).toBe(1);
});

test('a created event is listed under the active tab', async ({ page }) => {
  await db().event.create({
    data: {
      id: 'e2e-event-active',
      name: 'Pågående event',
      creatorId: TEST_USER.id,
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 86_400_000),
      participants: { create: { userId: TEST_USER.id, status: 'ACCEPTED' } },
    },
  });

  await page.goto('/events');
  await expectAuthenticated(page);

  const card = page.getByTestId('event-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Pågående event');
  await expect(page.getByTestId('events-tab').filter({ hasText: 'Aktiva' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

test('the leaderboard ranks participants by species count', async ({ page }) => {
  const startsAt = new Date(Date.now() - 86_400_000);
  const endsAt = new Date(Date.now() + 86_400_000);

  await db().event.create({
    data: {
      id: 'e2e-event-lb',
      name: 'Topplisteevent',
      creatorId: TEST_USER.id,
      startsAt,
      endsAt,
      participants: {
        create: [
          { userId: TEST_USER.id, status: 'ACCEPTED' },
          { userId: OTHER_USER.id, status: 'ACCEPTED' },
        ],
      },
    },
  });

  // The other user logs two species, the test user one — so the other user leads.
  for (const [birdId, userId] of [
    [BIRD.latin, OTHER_USER.id],
    ['turdus merula', OTHER_USER.id],
    [BIRD.latin, TEST_USER.id],
  ] as const) {
    const obs = await createObservation({ birdId, userId });
    await db().observationEvent.create({
      data: { observationId: obs.id, eventId: 'e2e-event-lb' },
    });
  }

  await page.goto('/events/e2e-event-lb');
  await expectAuthenticated(page);

  const rows = page.getByTestId('leaderboard-row');
  await expect(rows).toHaveCount(2);

  // Role-less divs with no accessible name — data-rank is the only way to assert
  // ordering here.
  await expect(rows.filter({ hasText: OTHER_USER.name })).toHaveAttribute('data-rank', '1');
  await expect(rows.filter({ hasText: TEST_USER.name })).toHaveAttribute('data-rank', '2');
});

test('a pending invite can be accepted', async ({ page }) => {
  await db().event.create({
    data: {
      id: 'e2e-event-invite',
      name: 'Inbjudet event',
      creatorId: OTHER_USER.id,
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 86_400_000),
      participants: { create: { userId: TEST_USER.id, status: 'INVITED' } },
    },
  });

  await page.goto('/events');
  await expectAuthenticated(page);

  // Scoping to the card matters: two pending invites would otherwise give two
  // indistinguishable "Acceptera" buttons.
  await page
    .locator('[data-testid="invite-card"][data-event-id="e2e-event-invite"]')
    .getByRole('button', { name: 'Acceptera', exact: true })
    .click();

  await expect
    .poll(async () =>
      (
        await db().participant.findFirst({
          where: { userId: TEST_USER.id, eventId: 'e2e-event-invite' },
        })
      )?.status
    )
    .toBe('ACCEPTED');
});
