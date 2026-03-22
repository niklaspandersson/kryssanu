import { createSignal } from 'solid-js';
import { pendingObs } from './offlineDb';
import { me as meApi } from './api';

export const [pendingCount, setPendingCount] = createSignal(0);

let syncing = false;

export async function syncPendingObservations(): Promise<{
  synced: number;
  failed: number;
}> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await pendingObs.getAll();
    pending.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const obs of pending) {
      try {
        await meApi.createObservation({
          birdId: obs.birdId,
          note: obs.note,
          location: obs.location,
        });
        await pendingObs.remove(obs.id);
        synced++;
      } catch {
        failed++;
      }
    }
  } finally {
    syncing = false;
    await refreshPendingCount();
  }

  return { synced, failed };
}

export async function refreshPendingCount(): Promise<void> {
  const pending = await pendingObs.getAll();
  setPendingCount(pending.length);
}

export function startAutoSync(): void {
  // Sync any leftover pending observations on startup
  refreshPendingCount().then(() => {
    if (pendingCount() > 0 && navigator.onLine) {
      syncPendingObservations();
    }
  });

  // Sync when the browser comes back online
  window.addEventListener('online', () => {
    syncPendingObservations();
  });
}
