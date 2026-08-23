import { Show } from "solid-js";
import styles from "./ObserveButton.module.css";

type Props = {
  observed: boolean;
  onAdd: () => void;
  birdName: string;
};

export default function ObserveButton(props: Props) {
  return (
    <button
      class={styles.btn}
      classList={{ [styles.observed]: props.observed }}
      onClick={() => props.onAdd()}
      aria-label={`Kryssa ${props.birdName}`}
      aria-pressed={props.observed}
    >
      <svg viewBox="0 0 28 28" class={styles.icon} aria-hidden="true">
        <rect x="3" y="5" width="16" height="16" rx="2" class={styles.box} />
        <Show when={props.observed}>
          <path
            d="M 5,13 L 10,22 L 27,3"
            class={styles.tick}
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </Show>
      </svg>
    </button>
  );
}
