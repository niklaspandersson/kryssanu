import { createSignal, createResource, createMemo, For, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import type { Bird } from "@kryssanu/shared";
import { birds, observations, events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import SearchInput from "./components/search/SearchInput";
import BirdRow from "./components/search/BirdRow";
import QuickAddSheet from "./components/search/QuickAddSheet";
import EmptyState from "../components/EmptyState";
import styles from "./SearchPage.module.css";

export default function SearchPage() {
  const { user, isLoggedIn, requestLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = createSignal("");
  const [selectedBird, setSelectedBird] = createSignal<Bird | null>(null);
  const [sheetOpen, setSheetOpen] = createSignal(false);

  const [allBirds] = createResource(() => birds.getAll());
  const [observedBirds, { mutate: setObserved }] = createResource(
    () => user(),
    () => observations.getObserved()
  );
  const [activeEvents] = createResource(
    () => user(),
    () => eventsApi.getAll("active")
  );

  const filtered = createMemo(() => {
    const list = allBirds() ?? [];
    const q = query().toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.swedish.toLowerCase().includes(q) ||
        b.family.toLowerCase().includes(q)
    );
  });

  function handleAdd(bird: Bird) {
    if (!isLoggedIn()) {
      requestLogin();
      return;
    }
    setSelectedBird(bird);
    setSheetOpen(true);
  }

  async function handleConfirm(data: {
    note?: string;
    location?: string;
    eventId?: string;
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

  return (
    <div class={styles.page}>
      <SearchInput value={query()} onInput={setQuery} />
      <Show
        when={!allBirds.loading}
        fallback={<EmptyState icon="hourglass_empty" message="Laddar faglar..." />}
      >
        <Show
          when={filtered().length > 0}
          fallback={<EmptyState icon="search_off" message="Inga faglar hittades" />}
        >
          <div class={styles.list}>
            <For each={filtered()}>
              {(bird) => (
                <BirdRow
                  bird={bird}
                  observed={observedBirds()?.[bird.id] ?? false}
                  onAdd={handleAdd}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
      <QuickAddSheet
        bird={selectedBird()}
        open={sheetOpen()}
        onClose={() => setSheetOpen(false)}
        onConfirm={handleConfirm}
        activeEvents={activeEvents() ?? []}
        preselectedEventId={searchParams.eventId as string | undefined}
      />
    </div>
  );
}
