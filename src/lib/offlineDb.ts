import type { Bird, PendingObservation } from './types';

const DB_NAME = 'kryssanu-offline';
const DB_VERSION = 3;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pendingObservations')) {
        db.createObjectStore('pendingObservations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cachedBirds')) {
        db.createObjectStore('cachedBirds', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('cachedApiData')) {
        db.createObjectStore('cachedApiData', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Pending observations ──────────────────────────────────────────

export const pendingObs = {
  async add(obs: PendingObservation): Promise<void> {
    const db = await openDb();
    await wrap(tx(db, 'pendingObservations', 'readwrite').add(obs));
  },

  async getAll(): Promise<PendingObservation[]> {
    const db = await openDb();
    return wrap(tx(db, 'pendingObservations', 'readonly').getAll());
  },

  async remove(id: string): Promise<void> {
    const db = await openDb();
    await wrap(tx(db, 'pendingObservations', 'readwrite').delete(id));
  },
};

// ── Bird list cache ───────────────────────────────────────────────

type BirdCacheRow = { key: string; version: number; birds: Bird[] };

const BIRDS_KEY = 'all';

export const birdCache = {
  async set(birds: Bird[], version: number): Promise<void> {
    const db = await openDb();
    await wrap(
      tx(db, 'cachedBirds', 'readwrite').put({ key: BIRDS_KEY, version, birds }),
    );
  },

  async get(): Promise<{ birds: Bird[]; version: number } | null> {
    const db = await openDb();
    const row = await wrap<BirdCacheRow | undefined>(
      tx(db, 'cachedBirds', 'readonly').get(BIRDS_KEY),
    );
    if (!row?.birds) return null;
    return { birds: row.birds, version: row.version };
  },

  async getVersion(): Promise<number | null> {
    const db = await openDb();
    const row = await wrap<BirdCacheRow | undefined>(
      tx(db, 'cachedBirds', 'readonly').get(BIRDS_KEY),
    );
    return row?.version ?? null;
  },
};

// ── API data cache ──────────────────────────────────────────────

type CachedApiRow = { key: string; data: unknown; cachedAt: number };

/**
 * Entries are keyed by URL, so every distinct query string — every page of
 * observations, every event, every species — creates a permanent row. Nothing
 * removed them except logout, so the store grew for the lifetime of the
 * install. These bounds keep it to roughly a session's worth of browsing;
 * anything evicted is re-fetched when online, and the offline app shell itself
 * lives in the service worker's precache, not here.
 */
const MAX_CACHED_RESPONSES = 100;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const apiCache = {
  async set(key: string, data: unknown): Promise<void> {
    const db = await openDb();
    await wrap(
      tx(db, 'cachedApiData', 'readwrite').put({
        key,
        data,
        cachedAt: Date.now(),
      } satisfies CachedApiRow),
    );
    // After the write, so a prune failure never loses the value just cached.
    await apiCache.prune().catch(() => {});
  },

  /**
   * Drop stale rows, then oldest-first until the count is under the cap.
   */
  async prune(): Promise<void> {
    const db = await openDb();
    const rows = await wrap<CachedApiRow[]>(
      tx(db, 'cachedApiData', 'readonly').getAll(),
    );

    const cutoff = Date.now() - MAX_CACHE_AGE_MS;
    const fresh: CachedApiRow[] = [];
    const doomed: string[] = [];

    for (const row of rows) {
      if (row.cachedAt < cutoff) doomed.push(row.key);
      else fresh.push(row);
    }

    if (fresh.length > MAX_CACHED_RESPONSES) {
      fresh.sort((a, b) => a.cachedAt - b.cachedAt);
      for (const row of fresh.slice(0, fresh.length - MAX_CACHED_RESPONSES)) {
        doomed.push(row.key);
      }
    }

    if (doomed.length === 0) return;

    const store = tx(db, 'cachedApiData', 'readwrite');
    await Promise.all(doomed.map((key) => wrap(store.delete(key))));
  },

  async get<T>(key: string): Promise<{ data: T; cachedAt: number } | null> {
    const db = await openDb();
    const row = await wrap<CachedApiRow | undefined>(
      tx(db, 'cachedApiData', 'readonly').get(key),
    );
    if (!row) return null;
    return { data: row.data as T, cachedAt: row.cachedAt };
  },

  async clear(): Promise<void> {
    const db = await openDb();
    await wrap(tx(db, 'cachedApiData', 'readwrite').clear());
  },
};
