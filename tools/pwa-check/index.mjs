/**
 * Checks that the PWA still starts without a usable network.
 *
 * Three scenarios, because they fail differently and only the first two are
 * commonly tested:
 *
 *   online  — cold start, populates the precache and the offline caches
 *   offline — airplane mode, the case `navigator.onLine` actually reports
 *   lie-fi  — a live radio passing no traffic, which is what a bad cell
 *             connection looks like and what used to hang the app forever
 *
 * Playwright is deliberately not a dependency of this project: the repository
 * has no test runner, and the Docker build installs devDependencies. Install it
 * when you want to run this:
 *
 *   npm i --no-save playwright@~1.56.0 && npx playwright install chromium
 *   npm run build && node tools/pwa-check/index.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from './server.mjs';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'playwright is not installed. Run:\n' +
      '  npm i --no-save playwright@~1.56.0 && npx playwright install chromium',
  );
  process.exit(1);
}

const ORIGIN = 'http://localhost:4173';
const START_URL = `${ORIGIN}/summary`;

/** The shell must render cached content this fast; it comes from the precache. */
const SHELL_BUDGET_MS = 5_000;
/** The offline banner waits out the API read timeout, so it is allowed longer. */
const BANNER_BUDGET_MS = 15_000;

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Polls `read` until it returns a truthy value, or the budget runs out. */
async function waitFor(page, read, budgetMs) {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const value = await page.evaluate(read).catch(() => null);
    if (value) return Date.now() - (deadline - budgetMs);
    if (Date.now() > deadline) return null;
    await page.waitForTimeout(250);
  }
}

/** Shown on a failure so the reason is visible without re-running by hand. */
async function rootText(page) {
  const text = await page
    .evaluate(`document.getElementById('root')?.textContent ?? ''`)
    .catch(() => '');
  return `rendered instead: ${text.replace(/\s+/g, ' ').trim().slice(0, 120)}`;
}

const HAS_CONTENT = `!!document.getElementById('root')?.textContent?.includes('Hej,')`;
const HAS_BANNER = `!!document.body?.textContent?.includes('Du är offline')`;

async function main() {
  if (!fs.existsSync(path.resolve('dist/sw.js'))) {
    console.error('dist/sw.js missing — run `npm run build` first.');
    process.exit(1);
  }

  const server = await startServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kryssanu-pwa-'));
  // channel: 'chromium' picks the full browser rather than the headless shell,
  // which does not run service workers.
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: 'chromium',
  });
  const page = await ctx.newPage();

  try {
    // ── online: cold start ────────────────────────────────────────────
    console.log('\nonline (cold start)');
    await page.goto(START_URL, { waitUntil: 'load' });
    const controlled = await page
      .waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    record('service worker takes control', controlled);
    const onlineContent = await waitFor(page, HAS_CONTENT, SHELL_BUDGET_MS);
    record('content renders', onlineContent !== null, onlineContent === null ? await rootText(page) : null);

    // ── offline: airplane mode ────────────────────────────────────────
    console.log('\noffline (airplane mode)');
    await ctx.setOffline(true);
    await page.goto(START_URL, { waitUntil: 'load' });
    const offlineContent = await waitFor(page, HAS_CONTENT, SHELL_BUDGET_MS);
    record(
      'cached content renders',
      offlineContent !== null,
      offlineContent !== null ? `${offlineContent}ms` : await rootText(page),
    );
    const offlineBanner = await waitFor(page, HAS_BANNER, BANNER_BUDGET_MS);
    record('offline banner shows', offlineBanner !== null, offlineBanner && `${offlineBanner}ms`);
    await ctx.setOffline(false);

    // ── lie-fi: connected, nothing gets through ───────────────────────
    console.log('\nlie-fi (connected, API stalls)');
    await ctx.route(`${ORIGIN}/api/**`, () => {
      /* never settle: the request hangs exactly as it does on a dying cell link */
    });
    await page.goto(START_URL, { waitUntil: 'load' });
    record('navigator.onLine still reports true', await page.evaluate(() => navigator.onLine));
    const liefiContent = await waitFor(page, HAS_CONTENT, SHELL_BUDGET_MS);
    record(
      'cached content renders',
      liefiContent !== null,
      liefiContent !== null ? `${liefiContent}ms` : await rootText(page),
    );
    const liefiBanner = await waitFor(page, HAS_BANNER, BANNER_BUDGET_MS);
    record('offline banner shows', liefiBanner !== null, liefiBanner && `${liefiBanner}ms`);
  } finally {
    await ctx.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
