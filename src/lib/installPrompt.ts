import { createSignal } from 'solid-js';

/** Not in TypeScript's DOM lib — Chromium-only event. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'kryssanu-install-dismissed';

const [deferred, setDeferred] = createSignal<BeforeInstallPromptEvent | null>(null);

// Chromium fires this once it considers the app installable — often before any
// page component mounts, which is why the listener is registered at import time.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  setDeferred(e as BeforeInstallPromptEvent);
});

window.addEventListener('appinstalled', () => setDeferred(null));

/** True once Chromium has offered us a prompt we can still show. */
export const canInstall = () => deferred() !== null;

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred();
  if (!event) return 'unavailable';
  // The prompt can only be shown once, so drop it either way.
  setDeferred(null);
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

/* ── Already installed? ──────────────────────────────────────────── */

const standaloneQuery = window.matchMedia('(display-mode: standalone)');

const [isStandalone, setIsStandalone] = createSignal(
  standaloneQuery.matches ||
    // iOS home-screen apps don't report display-mode.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
);

standaloneQuery.addEventListener('change', (e) => setIsStandalone(e.matches));

export { isStandalone };

/* ── iOS ─────────────────────────────────────────────────────────── */

const ua = navigator.userAgent;

const isIos =
  /iPad|iPhone|iPod/.test(ua) ||
  // iPadOS reports itself as a Mac; touch points give it away.
  (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

/** iOS Safari can add to the home screen, but never fires beforeinstallprompt. */
export const isIosSafari = isIos && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

/** Other iOS browsers can't add to the home screen at all — only Safari can. */
export const isIosOtherBrowser = isIos && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

/* ── Dismissal (per device/browser, not per account) ─────────────── */

const [dismissed, setDismissed] = createSignal(
  (() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  })()
);

export { dismissed as installPromptDismissed };

export function dismissInstallPrompt() {
  setDismissed(true);
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Private mode — the notice stays hidden for this session at least.
  }
}
