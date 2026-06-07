import { Show } from "solid-js";
import type { Bird } from "../../lib/types";
import ObserveButton from "../ObserveButton";
import styles from "./BirdRow.module.css";

type Props = {
  bird: Bird;
  observed: boolean;
  onAdd: (bird: Bird) => void;
};

export default function BirdRow(props: Props) {
  return (
    <div class={styles.row}>
      <ObserveButton
        observed={props.observed}
        onAdd={() => props.onAdd(props.bird)}
        birdName={props.bird.swedish}
      />
      <div class={styles.info}>
        <span class={styles.name}>
          {props.bird.swedish}
          <Show when={props.bird.visitor}>
            <span class={styles.visitorBadge}>Raritet</span>
          </Show>
        </span>
        <span class={styles.family}>{props.bird.family}</span>
      </div>
    </div>
  );
}
