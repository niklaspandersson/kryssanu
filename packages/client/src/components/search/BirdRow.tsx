import type { Bird } from "@kryssanu/shared";
import styles from "./BirdRow.module.css";

type Props = {
  bird: Bird;
  observed: boolean;
  onAdd: (bird: Bird) => void;
};

export default function BirdRow(props: Props) {
  return (
    <div class={styles.row}>
      <div class={styles.info}>
        <span class={styles.name}>{props.bird.swedish}</span>
        <span class={styles.family}>{props.bird.family}</span>
      </div>
      <div class={styles.actions}>
        {props.observed && (
          <span class={`md-icon ${styles.observed}`}>check_circle</span>
        )}
        <button
          class={styles.addBtn}
          onClick={() => props.onAdd(props.bird)}
          aria-label={`Lägg till observation av ${props.bird.swedish}`}
        >
          <span class="md-icon">add_circle</span>
        </button>
      </div>
    </div>
  );
}
