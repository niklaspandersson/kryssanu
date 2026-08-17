import { Show } from "solid-js";
import { A } from "@solidjs/router";
import type { Bird } from "../../lib/types";
import {
  INTRODUCED_TOOLTIP,
  RARITY_TOOLTIP,
  isIntroduced,
  isRarity,
} from "../../lib/birds";
import ObserveButton from "../ObserveButton";
import styles from "./BirdRow.module.css";

type Props = {
  bird: Bird;
  observed: boolean;
  onAdd: (bird: Bird) => void;
  onNavigate?: () => void;
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
        <A
          href={`/birds/${encodeURIComponent(props.bird.id)}`}
          class={styles.name}
          onClick={() => props.onNavigate?.()}
        >
          {props.bird.swedish}
          <Show when={isRarity(props.bird)}>
            <span class={styles.visitorBadge} title={RARITY_TOOLTIP}>Raritet</span>
          </Show>
          <Show when={isIntroduced(props.bird)}>
            <span class={styles.introducedBadge} title={INTRODUCED_TOOLTIP}>Introducerad</span>
          </Show>
        </A>
        <span class={styles.family}>{props.bird.family}</span>
      </div>
    </div>
  );
}
