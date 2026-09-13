import { createSignal } from 'solid-js';
import type { Bird } from './types';
import { birdCache } from './offlineDb';
import { fetchWithTimeout } from './api';

/** Tiny response; if it does not arrive quickly the cached list is the answer. */
const VERSION_TIMEOUT_MS = 8_000;
/** The full catalogue is ~1300 taxa, so allow for a slow but working link. */
const LIST_TIMEOUT_MS = 30_000;

const [allBirds, setAllBirds] = createSignal<Bird[]>([]);
const [birdsReady, setBirdsReady] = createSignal(false);

export { allBirds, birdsReady };

export async function initBirds(): Promise<void> {
  try {
    // Try fetching the server version
    const res = await fetchWithTimeout(
      '/api/birds/version',
      { credentials: 'include' },
      VERSION_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error('version check failed');
    const { version: serverVersion } = (await res.json()) as { version: number };

    // Compare with cached version
    const cached = await birdCache.get();
    if (cached && cached.version === serverVersion) {
      setAllBirds(cached.birds);
      setBirdsReady(true);
      return;
    }

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
    setBirdsReady(true);
  } catch {
    // Offline or error — fall back to cached data
    const cached = await birdCache.get();
    if (cached) {
      setAllBirds(cached.birds);
    }
    setBirdsReady(true);
  }
}
