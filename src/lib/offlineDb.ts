import type { Bird, PendingObservation } from './types';

const DB_NAME = 'kryssanu-offline';
const DB_VERSION = 1;

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

const BIRDS_KEY = 'all';

export const birdCache = {
  async set(birds: Bird[]): Promise<void> {
    const db = await openDb();
    await wrap(
      tx(db, 'cachedBirds', 'readwrite').put({ key: BIRDS_KEY, birds }),
    );
  },

  async get(): Promise<Bird[] | null> {
    const db = await openDb();
    const row = await wrap<{ key: string; birds: Bird[] } | undefined>(
      tx(db, 'cachedBirds', 'readonly').get(BIRDS_KEY),
    );
    return row?.birds ?? null;
  },
};
