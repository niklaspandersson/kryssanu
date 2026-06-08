import { Show, For } from "solid-js";
import type { Bird } from "../lib/types";
import BirdRow from "./search/BirdRow";
import EmptyState from "./EmptyState";
import styles from "./SearchResults.module.css";

type Props = {
  query: string;
  filtered: Bird[];
  observedBirds: Record<number, boolean>;
  onAdd: (bird: Bird) => void;
  onNavigate?: () => void;
};

export default function SearchResults(props: Props) {
  return (
    <div class={styles.results}>
      <Show
        when={props.query.trim().length > 0}
        fallback={
          <div class={styles.prompt}>
            <span class="md-icon">search</span>
            <span class={styles.promptText}>
              Skriv ett fågelnamn eller familj för att söka
            </span>
          </div>
        }
      >
        <Show
          when={props.filtered.length > 0}
          fallback={<EmptyState icon="search_off" message="Inga fåglar hittades" />}
        >
          <For each={props.filtered}>
            {(bird) => (
              <BirdRow
                bird={bird}
                observed={props.observedBirds[bird.id] ?? false}
                onAdd={props.onAdd}
                onNavigate={props.onNavigate}
              />
            )}
          </For>
        </Show>
      </Show>
    </div>
  );
}
