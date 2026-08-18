import { Show } from "solid-js";
import {
  canInstall,
  promptInstall,
  isStandalone,
  isIosSafari,
  isIosOtherBrowser,
  installPromptDismissed,
  dismissInstallPrompt,
} from "../lib/installPrompt";
import Icon from "./Icon";
import shared from "../styles/shared.module.css";
import styles from "./InstallPrompt.module.css";

/**
 * Nudge to install the PWA, shown only when this device and browser actually
 * can. Dismissal is per device (localStorage) — installing is a property of
 * the device, not of the account.
 */
export default function InstallPrompt() {
  const show = () =>
    !installPromptDismissed() &&
    !isStandalone() &&
    (canInstall() || isIosSafari || isIosOtherBrowser);

  return (
    <Show when={show()}>
      <section class={styles.notice}>
        <div class={styles.header}>
          <Icon
            name={
              canInstall()
                ? "install_mobile"
                : isIosSafari
                  ? "ios_share"
                  : "open_in_browser"
            }
            size={20}
          />
          <h2 class={styles.title}>Installera Kryssa.nu</h2>
          <button
            type="button"
            class={styles.close}
            aria-label="Stäng"
            onClick={dismissInstallPrompt}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <Show
          when={canInstall()}
          fallback={
            <Show
              when={isIosSafari}
              fallback={
                <p class={styles.text}>
                  Öppna kryssa.nu i Safari för att lägga till appen på
                  hemskärmen — andra webbläsare på iOS kan inte installera
                  appar.
                </p>
              }
            >
              <p class={styles.text}>
                Lägg till Kryssa.nu på hemskärmen så fungerar den som en app,
                även offline.
              </p>
              <p class={styles.hint}>
                Tryck på <Icon name="ios_share" size={16} class={styles.inlineIcon} />
                Dela och välj <strong>Lägg till på hemskärmen</strong>.
              </p>
            </Show>
          }
        >
          <p class={styles.text}>
            Lägg till Kryssa.nu på hemskärmen så fungerar den som en app, även
            offline.
          </p>
          <div class={styles.actions}>
            <button
              type="button"
              class={shared.actionBtn}
              onClick={() => promptInstall()}
            >
              <Icon name="download" size={18} />
              Installera
            </button>
          </div>
        </Show>
      </section>
    </Show>
  );
}
