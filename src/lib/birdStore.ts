import { createSignal } from 'solid-js';
import type { Bird } from './types';
import { birdCache } from './offlineDb';

const [allBirds, setAllBirds] = createSignal<Bird[]>([]);
const [birdsReady, setBirdsReady] = createSignal(false);

export { allBirds, birdsReady };

export async function initBirds(): Promise<void> {
  try {
    // Try fetching the server version
    const res = await fetch('/api/birds/version', { credentials: 'include' });
    if (!res.ok) throw new Error('version check failed');
    const { version: serverVersion } = (await res.json()) as { version: number };

    // Compare with cached version
    const cached = await birdCache.get('sweden');
    if (cached && cached.version === serverVersion) {
      setAllBirds(cached.birds);
      setBirdsReady(true);
      return;
    }

    // Version mismatch or no cache — fetch full list. Bypass the HTTP cache
    // (the list has a long max-age) so a version bump always yields fresh data.
    const listRes = await fetch('/api/birds', { credentials: 'include', cache: 'reload' });
    if (!listRes.ok) throw new Error('bird list fetch failed');
    const birds = (await listRes.json()) as Bird[];
    await birdCache.set('sweden', birds, serverVersion);
    setAllBirds(birds);
    setBirdsReady(true);
  } catch {
    // Offline or error — fall back to cached data
    const cached = await birdCache.get('sweden');
    if (cached) {
      setAllBirds(cached.birds);
    }
    setBirdsReady(true);
  }
}

// ── World bird list (everything outside Sweden's official list) ────
//
// Loaded in pages rather than one big response, and paced with
// requestIdleCallback so it never competes with foreground interaction.
// `ensureWorldBirds()` lets the UI collapse remaining pages into one
// back-to-back burst when a user is actively waiting on it.

const [worldBirds, setWorldBirds] = createSignal<Bird[]>([]);
const [worldBirdsReady, setWorldBirdsReady] = createSignal(false);

export { worldBirds, worldBirdsReady };

const WORLD_PAGE_SIZE = 1000;

let fastForward = false;
let worldLoadPromise: Promise<void> | null = null;

function idleDelay(): Promise<void> {
  return new Promise((resolve) => {
    if (fastForward) {
      resolve();
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 2000 });
    } else {
      setTimeout(resolve, 200);
    }
  });
}

async function loadWorldBirds(): Promise<void> {
  try {
    const res = await fetch('/api/birds/version?scope=world', { credentials: 'include' });
    if (!res.ok) throw new Error('world version check failed');
    const { version: serverVersion } = (await res.json()) as { version: number };

    const cached = await birdCache.get('world');
    if (cached && cached.version === serverVersion) {
      setWorldBirds(cached.birds);
      setWorldBirdsReady(true);
      return;
    }

    const collected: Bird[] = [];
    let offset = 0;
    while (offset < serverVersion) {
      await idleDelay();
      const pageRes = await fetch(
        `/api/birds?scope=world&limit=${WORLD_PAGE_SIZE}&offset=${offset}`,
        { credentials: 'include', cache: 'reload' },
      );
      if (!pageRes.ok) throw new Error('world bird page fetch failed');
      const page = (await pageRes.json()) as Bird[];
      if (page.length === 0) break;
      collected.push(...page);
      setWorldBirds([...collected]);
      offset += page.length;
    }

    await birdCache.set('world', collected, serverVersion);
    setWorldBirdsReady(true);
  } catch {
    // Offline or error — fall back to whatever's cached, if anything.
    const cached = await birdCache.get('world');
    if (cached) {
      setWorldBirds(cached.birds);
      setWorldBirdsReady(true);
    }
  }
}

/** Fire-and-forget: call once at app start to warm the world list in the background. */
export function prefetchWorldBirds(): void {
  if (!worldLoadPromise) {
    worldLoadPromise = loadWorldBirds();
  }
}

/** Used by the "search worldwide" UI: resolves once the full world list is available. */
export function ensureWorldBirds(): Promise<Bird[]> {
  fastForward = true;
  if (!worldLoadPromise) {
    worldLoadPromise = loadWorldBirds();
  }
  return worldLoadPromise.then(() => worldBirds());
}
