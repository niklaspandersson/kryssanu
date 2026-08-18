import { Show } from "solid-js";
import { A } from "@solidjs/router";
import type { Bird } from "../../lib/types";
import {
  OFFICIAL_TOOLTIP,
  RARITY_TOOLTIP,
  isOfficial,
  isRarity,
  isSubspecies,
} from "../../lib/birds";
import Icon from "../Icon";
import { allBirds } from "../../lib/birdStore";
import ObserveButton from "../ObserveButton";
import styles from "./BirdRow.module.css";

type Props = {
  bird: Bird;
  observed: boolean;
  onAdd: (bird: Bird) => void;
  onNavigate?: () => void;
};

export default function BirdRow(props: Props) {
  const parent = () => allBirds().find(b => b.id === props.bird.parentId);

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
          <Show when={isOfficial(props.bird)}>
            <Icon
              name="verified"
              size={16}
              class={styles.officialIcon}
              title={OFFICIAL_TOOLTIP}
            />
          </Show>
        </A>
        <span class={styles.family}>
          {isSubspecies(props.bird) && parent()
            ? `underart av ${parent()!.swedish}`
            : props.bird.family}
        </span>
      </div>
    </div>
  );
}
