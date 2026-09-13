import { Show, onCleanup } from "solid-js";
import { useRegisterSW } from "virtual:pwa-register/solid";
import Icon from "./Icon";
import styles from "./UpdatePrompt.module.css";

/** Re-check for a new build about once an hour while the app stays open. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Offers the staged build rather than reloading the page underneath the user,
 * who may be halfway through logging a kryss.
 *
 * Navigations are served from the precache, so freshness rides entirely on the
 * service worker update cycle: the browser re-fetches sw.js, which embeds the
 * precache manifest, installs the new shell and its assets in the background,
 * and only then does `needRefresh` flip.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // An installed PWA is normally resumed from the background rather than
      // launched fresh, so the navigation that would otherwise trigger an
      // update check may not happen for weeks. A check while offline just
      // fails; the next one picks it up.
      const check = () => void registration.update().catch(() => {});

      const onVisible = () => {
        if (document.visibilityState === "visible") check();
      };
      document.addEventListener("visibilitychange", onVisible);
      const timer = setInterval(check, UPDATE_CHECK_INTERVAL_MS);

      onCleanup(() => {
        document.removeEventListener("visibilitychange", onVisible);
        clearInterval(timer);
      });
    },
  });

  return (
    <Show when={needRefresh()}>
      <div class={styles.prompt} role="status">
        <Icon name="system_update" size={20} />
        <span class={styles.text}>Ny version tillgänglig</span>
        <button
          type="button"
          class={styles.reload}
          onClick={() => updateServiceWorker(true)}
        >
          Ladda om
        </button>
        <button
          type="button"
          class={styles.close}
          aria-label="Stäng"
          onClick={() => setNeedRefresh(false)}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </Show>
  );
}
