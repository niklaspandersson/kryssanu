import { createSignal } from 'solid-js';
import { registerSW } from 'virtual:pwa-register';

/**
 * Applying a new build means a full page load — the running page holds the old
 * bundle in memory, and nothing short of reloading replaces it. The question is
 * only *when*, and the answer here is "at a moment the user was already leaving
 * the current view", so the reload never reads as one.
 *
 * Two such moments, neither of which needs a prompt:
 *
 *   - The app is closed. A worker that never calls skipWaiting() activates on
 *     its own once the last page it would replace is gone, so the next launch
 *     is simply the new build. On a phone this is the common case.
 *   - The user navigates. `applyUpdateOnNavigate` in App.tsx turns the first
 *     in-app navigation after an update into a real one, landing on the page
 *     they asked for, running the new build.
 */

/** Re-check for a new build about once an hour while the app stays open. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * How long to wait for the new worker to take over before navigating anyway.
 * Missing the swap costs nothing — the old build stays until the next
 * opportunity — but swallowing the tap would be a broken link.
 */
const ACTIVATION_TIMEOUT_MS = 2_000;

const [updateReady, setUpdateReady] = createSignal(false);

/** True once a new build is precached and waiting to take over. */
export { updateReady };

let swRegistration: ServiceWorkerRegistration | undefined;

registerSW({
  onNeedRefresh() {
    setUpdateReady(true);
  },
  onRegisteredSW(_swUrl, registration) {
    swRegistration = registration;
    if (!registration) return;

    // An installed PWA is normally resumed from the background rather than
    // launched fresh, so the navigation that would otherwise trigger an update
    // check may not happen for weeks. A check while offline just fails; the
    // next one picks it up.
    const check = () => void registration.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  },
});

/**
 * Hand over to the waiting build and continue to `href` as a full page load.
 * Returns false when there is nothing staged, in which case the caller should
 * navigate normally.
 */
export function applyUpdateAndNavigate(href: string): boolean {
  const waiting = swRegistration?.waiting;
  if (!waiting) {
    // Already activated, or never staged. Either way there is nothing to swap.
    setUpdateReady(false);
    return false;
  }

  let navigated = false;
  const go = () => {
    if (navigated) return;
    navigated = true;
    window.location.assign(href);
  };

  navigator.serviceWorker.addEventListener('controllerchange', go, { once: true });
  setTimeout(go, ACTIVATION_TIMEOUT_MS);
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
