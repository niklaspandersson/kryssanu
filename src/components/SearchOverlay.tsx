import { createSignal, createResource, createMemo, createEffect, Show, For } from "solid-js";
import type { Bird } from "../lib/types";
import { birds, observations } from "../lib/api";
import { useAuth } from "../lib/auth";
import BirdRow from "./search/BirdRow";
import QuickAddSheet from "./search/QuickAddSheet";
import EmptyState from "./EmptyState";
import styles from "./SearchOverlay.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SearchOverlay(props: Props) {
  const { user, isLoggedIn, showOneTap } = useAuth();
  const [query, setQuery] = createSignal("");
  const [selectedBird, setSelectedBird] = createSignal<Bird | null>(null);
  const [sheetOpen, setSheetOpen] = createSignal(false);

  const [allBirds] = createResource(() => props.open, (open) => open ? birds.getAll() : undefined);
  const [observedBirds, { mutate: setObserved }] = createResource(
    () => props.open && user(),
    () => observations.getObserved()
  );
  const filtered = createMemo(() => {
    const list = allBirds() ?? [];
    const q = query().toLowerCase().trim();
    if (!q) return [];
    return list.filter(
      (b) =>
        b.swedish.toLowerCase().includes(q) ||
        b.family.toLowerCase().includes(q)
    );
  });

  function handleAdd(bird: Bird) {
    if (!isLoggedIn()) {
      showOneTap();
      return;
    }
    setSelectedBird(bird);
    setSheetOpen(true);
  }

  async function handleConfirm(data: {
    note?: string;
    location?: string;
  }) {
    const bird = selectedBird();
    if (!bird) return;

    await observations.create({
      birdId: bird.id,
      ...data,
    });

    setObserved((prev) => ({ ...prev, [bird.id]: true }));
    setSheetOpen(false);
    setSelectedBird(null);
  }

  function handleClose() {
    setQuery("");
    props.onClose();
  }

  let inputRef!: HTMLInputElement;

  createEffect(() => {
    if (props.open) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  return (
    <Show when={props.open}>
      <div class={styles.overlay}>
        <div class={styles.header}>
          <span class="md-icon">search</span>
          <input
            ref={inputRef}
            type="text"
            class={styles.searchInput}
            placeholder="Sök efter fågel..."
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            autofocus
          />
          <button class={styles.closeBtn} onClick={handleClose}>
            <span class="md-icon">close</span>
          </button>
        </div>

        <div class={styles.results}>
          <Show
            when={query().trim().length > 0}
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
              when={filtered().length > 0}
              fallback={<EmptyState icon="search_off" message="Inga fåglar hittades" />}
            >
              <For each={filtered()}>
                {(bird) => (
                  <BirdRow
                    bird={bird}
                    observed={observedBirds()?.[bird.id] ?? false}
                    onAdd={handleAdd}
                  />
                )}
              </For>
            </Show>
          </Show>
        </div>

        <QuickAddSheet
          bird={selectedBird()}
          open={sheetOpen()}
          onClose={() => setSheetOpen(false)}
          onConfirm={handleConfirm}
        />
      </div>
    </Show>
  );
}
