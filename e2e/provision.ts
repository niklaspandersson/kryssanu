/**
 * Prepare the test database. Idempotent — safe to re-run.
 *
 * This runs BEFORE `playwright test`, not from a Playwright global setup, on
 * purpose. Playwright starts its `webServer` entries before global setup runs,
 * and the API readiness probe (/api/birds/version) counts rows in Bird. If
 * provisioning happened inside Playwright, that probe would hit an empty
 * database, the web server would never report ready, and the run would deadlock
 * before setup ever executed.
 */
import { execFileSync } from 'node:child_process';
import { db, disconnect, TEST_DATABASE_URL, TEST_USER, OTHER_USER } from './db';

function run(cmd: string, args: string[]): void {
  execFileSync(cmd, args, {
    stdio: 'inherit',
    // prisma/seed.ts reads 'tools/data-import/birds.json' by relative path, so
    // the repo root is the only cwd this works from.
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

async function main(): Promise<void> {
  console.log(`Provisioning ${TEST_DATABASE_URL.replace(/:[^:@]*@/, ':***@')}`);

  run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss']);

  const prisma = db();

  // Prisma cannot express a column collation. Without this, MySQL's default
  // utf8mb4_unicode_ci makes 'H' and 'h' compare equal, so `WHERE status = 'h'`
  // matches all 445 breeders instead of the 3 irregular ones.
  // See the comment on Bird.status in prisma/schema.prisma.
  await prisma.$executeRawUnsafe(
    "ALTER TABLE `Bird` MODIFY `status` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT ''"
  );

  const birdCount = await prisma.bird.count();
  if (birdCount === 0) {
    run('npx', ['tsx', 'prisma/seed.ts']);
  } else {
    console.log(`Birds already seeded (${birdCount}), skipping.`);
  }

  // /api/auth/dev-login mints a session for an existing user but never creates
  // one, so the fixture users have to exist before any test can log in.
  for (const user of [TEST_USER, OTHER_USER]) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: { name: user.name, email: user.email },
    });
  }

  console.log(`Provisioned: ${await prisma.bird.count()} birds, 2 test users.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(disconnect);
