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
 *   update  — a deploy lands while the app is open; the new build must take
 *             over on the next navigation and, separately, on the next launch,
 *             with nothing to tap in either case
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
import { execFileSync } from 'node:child_process';
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

/**
 * Builds a copy of the app carrying `markerId` in its shell, standing in for a
 * deploy. Two of these let each update path be tested against a build only it
 * could have produced. Restores index.html whether or not the build succeeds.
 */
function buildVariant(outDir, markerId) {
  const indexHtml = path.resolve('index.html');
  const original = fs.readFileSync(indexHtml, 'utf8');
  try {
    fs.writeFileSync(
      indexHtml,
      original.replace('<div id="root"></div>', `<div id="root"></div><div id="${markerId}"></div>`)
    );
    execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], { stdio: 'pipe' });
  } finally {
    fs.writeFileSync(indexHtml, original);
  }
}

/** Deploys `dir` and waits for the worker it contains to finish staging. */
async function stageDeploy(page, server, dir, budgetMs) {
  server.serve(dir);
  // What the hourly timer and the foreground check would do on their own.
  await page.evaluate(
    `navigator.serviceWorker.getRegistration().then((r) => r && r.update())`
  );
  return waitFor(
    page,
    `navigator.serviceWorker.getRegistration().then((r) => !!r?.waiting)`,
    budgetMs
  );
}

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

/** Marks the two stand-in deploys, so each path is proven against its own build. */
const MARKER_A = 'pwa-check-build-a';
const MARKER_B = 'pwa-check-build-b';

const HAS_CONTENT = `!!document.getElementById('root')?.textContent?.includes('Hej,')`;
const HAS_BANNER = `!!document.body?.textContent?.includes('Du är offline')`;

async function main() {
  if (!fs.existsSync(path.resolve('dist/sw.js'))) {
    console.error('dist/sw.js missing — run `npm run build` first.');
    process.exit(1);
  }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kryssanu-pwa-'));
  const buildA = path.join(profile, 'dist-a');
  const buildB = path.join(profile, 'dist-b');
  buildVariant(buildA, MARKER_A);
  buildVariant(buildB, MARKER_B);

  const server = await startServer();
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
    await ctx.unroute(`${ORIGIN}/api/**`);

    // ── update via navigation ─────────────────────────────────────────
    console.log('\nupdate (deploy while the app is open)');
    await page.goto(START_URL, { waitUntil: 'load' });
    const staged = await stageDeploy(page, server, buildA, SHELL_BUDGET_MS);
    record('new build stages in the background', staged !== null, staged && `${staged}ms`);
    record(
      'nothing asks the user to reload',
      !(await page.evaluate(`(document.body?.textContent ?? '').includes('Ny version')`))
    );

    // An ordinary in-app navigation is what applies it.
    await page.click('a[href="/about"]');
    await page.waitForURL(`${ORIGIN}/about`, { timeout: SHELL_BUDGET_MS }).catch(() => {});
    const swapped = await waitFor(page, `!!document.getElementById('${MARKER_A}')`, SHELL_BUDGET_MS);
    record('navigation lands on the new build', swapped !== null, swapped && `${swapped}ms`);
    record('navigation reached the requested page', new URL(page.url()).pathname === '/about');

    // ── update via next launch ────────────────────────────────────────
    console.log('\nupdate (deploy picked up on next launch)');
    const stagedB = await stageDeploy(page, server, buildB, SHELL_BUDGET_MS);
    record('next build stages in the background', stagedB !== null, stagedB && `${stagedB}ms`);

    // Closing the last page leaves the waiting worker free to activate, which
    // is what swiping the app away on a phone does.
    await page.close();
    const relaunched = await ctx.newPage();
    await relaunched.goto(START_URL, { waitUntil: 'load' });
    const launchSwapped = await waitFor(
      relaunched,
      `!!document.getElementById('${MARKER_B}')`,
      SHELL_BUDGET_MS
    );
    record('next launch runs the new build', launchSwapped !== null, launchSwapped && `${launchSwapped}ms`);
    record(
      'content still renders on the new build',
      (await waitFor(relaunched, HAS_CONTENT, SHELL_BUDGET_MS)) !== null
    );
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
