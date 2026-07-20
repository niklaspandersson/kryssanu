import { createSignal } from 'solid-js';

const [observationsRevision, setObservationsRevision] = createSignal(0);

export { observationsRevision };

/**
 * Bump the observations revision so any resource whose source reads
 * `observationsRevision()` re-fetches. Call after an observation has been
 * persisted to the server (a direct create or an offline queue sync).
 */
export function notifyObservationCreated(): void {
  setObservationsRevision((n) => n + 1);
}
