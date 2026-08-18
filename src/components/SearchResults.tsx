import { Show, For } from "solid-js";
import type { Bird } from "../lib/types";
import BirdRow from "./search/BirdRow";
import EmptyState from "./EmptyState";
import styles from "./SearchResults.module.css";

type Props = {
  query: string;
  filtered: Bird[];
  /** Total matches before the display cap; may exceed filtered.length. */
  matchCount: number;
  observedBirds: Record<string, boolean>;
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
          fallback={
            <>
              <EmptyState icon="search_off" message="Inga fåglar hittades" />
              {/* The catalog is Sverigelistan, so a miss means the taxon has
                  never been recorded in Sweden. Those sightings belong in
                  Artportalen, where Raritetskommittén reviews them. */}
              <p class={styles.notFoundNotice}>
                Listan följer{" "}
                <a
                  href="https://birdlife.se/tk/vastpalearktislistan/sverige-underarter/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sverigelistan
                </a>{" "}
                och innehåller alla fåglar som setts i Sverige. Har du sett något
                som inte finns här? Rapportera fyndet i{" "}
                <a href="https://artportalen.se" target="_blank" rel="noopener noreferrer">
                  Artportalen
                </a>{" "}
                så granskas det av Raritetskommittén.
              </p>
            </>
          }
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
          {/* Short queries match most of the catalog; say so rather than
              presenting a truncated list as the whole result. */}
          <Show when={props.matchCount > props.filtered.length}>
            <p class={styles.truncatedNotice}>
              Visar {props.filtered.length} av {props.matchCount} träffar –
              förfina sökningen för att se fler.
            </p>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
