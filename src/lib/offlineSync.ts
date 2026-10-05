import { createSignal } from 'solid-js';
import type { Bird, PendingObservation } from './types';
import { pendingObs } from './offlineDb';
import { me as meApi, HttpError } from './api';
import { isOnline, onReconnect } from './useOnlineStatus';
import { notifyObservationCreated } from './observationStore';

export const [pendingCount, setPendingCount] = createSignal(0);
export const [pendingObservations, setPendingObservations] = createSignal<
  PendingObservation[]
>([]);

/** What the quick-add sheets collect for a new observation. */
export type NewObservation = {
  note?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  listIds?: string[];
  image?: File;
};

/**
 * Every observation goes through the queue, online or not. Posting directly
 * while "online" left nothing to fall back on: on a link that had just died the
 * write hung for its full timeout, and the observation was then dropped. Once
 * queued it is safe, and the sync delivers it now or on reconnect.
 */
export async function queueObservation(
  bird: Pick<Bird, 'id' | 'swedish'>,
  data: NewObservation,
): Promise<void> {
  await pendingObs.add({
    id: crypto.randomUUID(),
    birdId: bird.id,
    birdName: bird.swedish,
    note: data.note,
    location: data.location,
    latitude: data.latitude,
    longitude: data.longitude,
    listIds: data.listIds,
    image: data.image,
    createdAt: new Date().toISOString(),
  });
  await refreshPendingCount();
  if (isOnline()) void syncPendingObservations();
}

let syncing = false;
/** Set when a sync is requested mid-run, so items queued meanwhile are not left
 *  waiting for the next reconnect. */
let syncAgain = false;

export async function syncPendingObservations(): Promise<{
  synced: number;
  failed: number;
}> {
  if (syncing) {
    syncAgain = true;
    return { synced: 0, failed: 0 };
  }
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
        let serverId = obs.serverId;
        if (!serverId) {
          const created = await meApi.createObservation({
            birdId: obs.birdId,
            note: obs.note,
            location: obs.location,
            latitude: obs.latitude,
            longitude: obs.longitude,
            listIds: obs.listIds,
          });
          serverId = created.id;
          // Recorded before the upload, so a failed upload is retried on its
          // own instead of by creating the observation again.
          if (obs.image) await pendingObs.put({ ...obs, serverId });
        }
        if (obs.image) {
          try {
            await meApi.uploadObservationImage(serverId, obs.image);
          } catch (e) {
            // The server read the photo and refused it; retrying will not
            // change that. Keep the observation, drop the photo.
            if (!(e instanceof HttpError) || e.status === 401) throw e;
            console.error('Bilduppladdning misslyckades', e);
          }
        }
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

  if (syncAgain) {
    syncAgain = false;
    if (isOnline()) void syncPendingObservations();
  }

  return { synced, failed };
}

/** Resolves to the size of the whole queue, including photos still waiting
 *  for an observation that has already been created. */
export async function refreshPendingCount(): Promise<number> {
  const pending = await pendingObs.getAll();
  // An observation with a serverId is already on the server and shows up in
  // server data; listing it here too would show it twice.
  const unsynced = pending.filter((p) => !p.serverId);
  setPendingObservations(unsynced);
  setPendingCount(unsynced.length);
  return pending.length;
}

export function startAutoSync(): void {
  // Sync any leftover pending observations on startup
  refreshPendingCount().then((queued) => {
    if (queued > 0 && isOnline()) {
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
