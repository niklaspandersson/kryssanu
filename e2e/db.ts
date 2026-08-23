import { PrismaClient } from '@prisma/client';

/**
 * The test database. Everything here talks to MySQL directly rather than through
 * the API, so it works before the PHP server is up.
 */
export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  'mysql://root:kryssanutest@127.0.0.1:3307/kryssanu_test';

let client: PrismaClient | null = null;

export function db(): PrismaClient {
  client ??= new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  });
  return client;
}

export async function disconnect(): Promise<void> {
  await client?.$disconnect();
  client = null;
}

/** The user every spec logs in as. Created by provision.ts. */
export const TEST_USER = {
  id: 'e2e-user-primary',
  name: 'E2E Testanvändare',
  email: 'e2e@kryssa.test',
};

/** A second user, for leaderboards and anything needing someone else's data. */
export const OTHER_USER = {
  id: 'e2e-user-other',
  name: 'Anna Andersson',
  email: 'e2e-other@kryssa.test',
};

/**
 * Wipe everything a test could have created, in foreign-key-safe order.
 *
 * Deliberately does NOT touch Bird (928 rows, expensive to seed and immutable),
 * User, or Session — keeping users and their sessions alive is what lets a
 * single storageState stay valid for the whole run.
 */
export async function resetData(): Promise<void> {
  const prisma = db();
  await prisma.$transaction([
    prisma.observationList.deleteMany(),
    prisma.observationEvent.deleteMany(),
    prisma.observationImage.deleteMany(),
    prisma.observation.deleteMany(),
    prisma.participant.deleteMany(),
    prisma.inviteToken.deleteMany(),
    prisma.event.deleteMany(),
    prisma.list.deleteMany(),
  ]);
}

/** Create an observation directly, for tests that need pre-existing data. */
export async function createObservation(opts: {
  birdId: string;
  userId?: string;
  location?: string;
  note?: string;
  date?: Date;
}) {
  return db().observation.create({
    data: {
      birdId: opts.birdId,
      userId: opts.userId ?? TEST_USER.id,
      location: opts.location,
      note: opts.note,
      date: opts.date ?? new Date(),
    },
  });
}

export async function createList(opts: {
  name: string;
  userId?: string;
  description?: string;
}) {
  return db().list.create({
    data: {
      name: opts.name,
      description: opts.description,
      userId: opts.userId ?? TEST_USER.id,
    },
  });
}
