import { createSignal } from 'solid-js';
import type { PendingObservation } from './types';
import { pendingObs } from './offlineDb';
import { me as meApi } from './api';
import { isOnline, onReconnect } from './useOnlineStatus';
import { notifyObservationCreated } from './observationStore';

export const [pendingCount, setPendingCount] = createSignal(0);
export const [pendingObservations, setPendingObservations] = createSignal<
  PendingObservation[]
>([]);

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
          latitude: obs.latitude,
          longitude: obs.longitude,
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

  // Server-backed activity feeds can now include the synced observations.
  if (synced > 0) notifyObservationCreated();

  return { synced, failed };
}

export async function refreshPendingCount(): Promise<void> {
  const pending = await pendingObs.getAll();
  setPendingObservations(pending);
  setPendingCount(pending.length);
}

export function startAutoSync(): void {
  // Sync any leftover pending observations on startup
  refreshPendingCount().then(() => {
    if (pendingCount() > 0 && isOnline()) {
      syncPendingObservations();
    }
  });

  // Sync once the server is actually reachable again. The browser's 'online'
  // event fires for an interface coming up, which on a phone routinely happens
  // while nothing can be reached yet; every observation in the queue would then
  // fail its POST and stay queued until the next event that never comes.
  onReconnect(() => {
    syncPendingObservations();
  });
}
