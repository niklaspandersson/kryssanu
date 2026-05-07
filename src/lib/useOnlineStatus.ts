import { createSignal } from 'solid-js';

const [isOnline, setIsOnline] = createSignal(navigator.onLine);

const PROBE_URL = '/api/me';
const PROBE_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 5_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function probeServer(): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(PROBE_URL, { cache: 'no-store', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function poll() {
  if (await probeServer()) {
    setIsOnline(true);
    stopPolling();
    window.dispatchEvent(new Event('online')); // triggers offlineSync
  }
}

function startPolling() {
  if (pollTimer !== null) return;
  pollTimer = setInterval(async () => {
    poll();
  }, POLL_INTERVAL_MS);
}

window.addEventListener('online', () => {
  setIsOnline(true);
  stopPolling();
});

window.addEventListener('offline', () => {
  setIsOnline(false);
  startPolling();
});

// Probe immediately when tab becomes visible while offline
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && !isOnline()) {
    poll();
  }
});

// Start polling on load if already offline
if (!navigator.onLine) startPolling();

export { isOnline };
