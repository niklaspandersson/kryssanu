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
