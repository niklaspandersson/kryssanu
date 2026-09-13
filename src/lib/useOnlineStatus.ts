import { createSignal } from 'solid-js';

/**
 * `navigator.onLine` only reports whether a network interface exists. On a
 * phone it stays true on a cell connection that passes no traffic at all,
 * which is precisely the situation the offline mode is built for. So "online"
 * here means the server answered recently: the API layer reports every request
 * that reaches the server and every one that does not, and while we believe
 * the network is down we poll a cheap endpoint until it comes back.
 */
const [isOnline, setIsOnline] = createSignal(navigator.onLine);

const PROBE_URL = '/api/health';
const PROBE_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 5_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let probeInFlight: Promise<boolean> | null = null;

const reconnectListeners = new Set<() => void>();

/**
 * Run `fn` when connectivity is regained. Replaces listening for the browser's
 * 'online' event, which fires for an interface coming up rather than for the
 * server becoming reachable through it.
 */
export function onReconnect(fn: () => void): void {
  reconnectListeners.add(fn);
}

async function runProbe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // credentials: 'omit' sends no session cookie, which keeps
    // SessionMiddleware off the database for what is only a reachability check.
    const res = await fetch(PROBE_URL, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** At most one probe is in flight; concurrent callers share its result. */
function probe(): Promise<boolean> {
  if (!probeInFlight) {
    probeInFlight = runProbe().finally(() => {
      probeInFlight = null;
    });
  }
  return probeInFlight;
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => {
    void probe().then(setConnected);
  }, POLL_INTERVAL_MS);
}

function setConnected(next: boolean) {
  const was = isOnline();
  setIsOnline(next);
  if (next) {
    stopPolling();
    if (!was) for (const fn of reconnectListeners) fn();
  } else {
    startPolling();
  }
}

/**
 * Called by the API layer when a request reaches the server. A real response
 * is stronger evidence than a probe, and free.
 */
export function reportReachable(): void {
  setConnected(true);
}

/**
 * Called by the API layer when a request times out or fails at the transport
 * level, i.e. it never reached the server. Believed immediately rather than
 * confirmed by a probe first: waiting out another probe timeout before showing
 * the offline UI is the delay this mechanism exists to remove, and the polling
 * this starts corrects a false alarm within POLL_INTERVAL_MS.
 */
export function reportUnreachable(): void {
  setConnected(false);
}

window.addEventListener('offline', () => setConnected(false));

// An 'online' event means an interface came up, not that anything is reachable
// through it — confirm before believing it.
window.addEventListener('online', () => {
  void probe().then(setConnected);
});

// A phone that was offline when it was put away is often back on a network when
// it is picked up again; check without waiting for the next poll tick.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !isOnline()) {
    void probe().then(setConnected);
  }
});

// Start polling on load if the browser already knows there is no network.
if (!navigator.onLine) startPolling();

export { isOnline };
