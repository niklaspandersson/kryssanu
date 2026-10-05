import { createSignal } from 'solid-js';
import type { Bird } from './types';
import { birdCache } from './offlineDb';
import { fetchWithTimeout } from './api';

/** Tiny response; the cached list is already showing while it runs. */
const VERSION_TIMEOUT_MS = 8_000;
/** The full catalogue is ~1300 taxa, so allow for a slow but working link. */
const LIST_TIMEOUT_MS = 30_000;

const [allBirds, setAllBirds] = createSignal<Bird[]>([]);
const [birdsReady, setBirdsReady] = createSignal(false);

export { allBirds, birdsReady };

/**
 * The cached catalogue is shown first and the version check runs behind it.
 * Waiting on the check before reading the cache left search empty for the full
 * version timeout on a stalled connection — the moment someone opens the app
 * to log a bird is exactly when that hurts.
 */
export async function initBirds(): Promise<void> {
  const cached = await birdCache.get().catch(() => null);
  if (cached) {
    setAllBirds(cached.birds);
    setBirdsReady(true);
  }

  try {
    const res = await fetchWithTimeout(
      '/api/birds/version',
      { credentials: 'include' },
      VERSION_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error('version check failed');
    const { version: serverVersion } = (await res.json()) as { version: number };
    if (cached && cached.version === serverVersion) return;

    // Version mismatch or no cache — fetch full list. Bypass the HTTP cache
    // (the list has a long max-age) so a version bump always yields fresh data.
    const listRes = await fetchWithTimeout(
      '/api/birds',
      { credentials: 'include', cache: 'reload' },
      LIST_TIMEOUT_MS,
    );
    if (!listRes.ok) throw new Error('bird list fetch failed');
    const birds = (await listRes.json()) as Bird[];
    await birdCache.set(birds, serverVersion);
    setAllBirds(birds);
  } catch {
    // Offline or error — the cached list, if any, is already showing.
  } finally {
    setBirdsReady(true);
  }
}
