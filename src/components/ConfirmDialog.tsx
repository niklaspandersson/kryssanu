import { createEffect, onCleanup, Show } from "solid-js";
import styles from "./ConfirmDialog.module.css";

type Props = {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog(props: Props) {
  createEffect(() => {
    if (props.open) {
      document.body.classList.add("overlay-open");
      onCleanup(() => document.body.classList.remove("overlay-open"));
    }
  });

  return (
    <Show when={props.open}>
      <div
        class={styles.overlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onCancel();
        }}
      >
        <div class={styles.card} role="dialog" aria-modal="true">
          <h3 class={styles.title}>{props.title}</h3>
          <p class={styles.text}>{props.text}</p>
          <div class={styles.actions}>
            <button class={styles.btnGhost} onClick={props.onCancel}>
              Avbryt
            </button>
            <button
              class={styles.btnDanger}
              disabled={props.busy}
              onClick={props.onConfirm}
            >
              {props.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
