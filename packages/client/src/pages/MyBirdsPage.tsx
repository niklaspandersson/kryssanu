import { createSignal, createResource, createMemo, Show, For, onMount } from "solid-js";
import { observations, events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import QuickAddSheet from "../components/search/QuickAddSheet";
import type { Bird } from "@kryssanu/shared";
import styles from "./MyBirdsPage.module.css";

type ShowMode = "all" | "observed";
type TimeFilter = "all" | "year";
type SortMode = "alpha" | "family";

export default function MyBirdsPage() {
  const { isLoggedIn, requestLogin } = useAuth();

  onMount(() => {
    if (!isLoggedIn()) requestLogin();
  });

  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem("mybirds-filters") ?? "{}");
    } catch {
      return {};
    }
  })();

  const [showMode, setShowMode] = createSignal<ShowMode>(stored.show ?? "all");
  const [timeFilter, setTimeFilter] = createSignal<TimeFilter>(stored.time ?? "all");
  const [sortMode, setSortMode] = createSignal<SortMode>(stored.sort ?? "alpha");

  function persistFilters(show: ShowMode, time: TimeFilter, sort: SortMode) {
    localStorage.setItem("mybirds-filters", JSON.stringify({ show, time, sort }));
  }

  function updateShowMode(v: ShowMode) { setShowMode(v); persistFilters(v, timeFilter(), sortMode()); }
  function updateTimeFilter(v: TimeFilter) { setTimeFilter(v); persistFilters(showMode(), v, sortMode()); }
  function updateSortMode(v: SortMode) { setSortMode(v); persistFilters(showMode(), timeFilter(), v); }
  const [quickAddBird, setQuickAddBird] = createSignal<Bird | null>(null);

  const [data, { refetch }] = createResource(() => isLoggedIn(), (loggedIn) =>
    loggedIn ? observations.checklist() : undefined
  );
  const [activeEvents] = createResource(() => isLoggedIn(), (loggedIn) =>
    loggedIn ? eventsApi.getAll("active") : undefined
  );

  const currentYear = new Date().getFullYear();

  const observedSet = createMemo(() => {
    const d = data();
    if (!d) return new Set<string>();
    const set = new Set<string>();
    for (const [birdId, dates] of Object.entries(d.observed)) {
      if (timeFilter() === "year") {
        if (dates.some(date => new Date(date).getFullYear() === currentYear)) {
          set.add(birdId);
        }
      } else {
        set.add(birdId);
      }
    }
    return set;
  });

  const filteredBirds = createMemo(() => {
    const d = data();
    if (!d) return [];
    const obs = observedSet();
    let list = d.birds;
    if (showMode() === "observed") {
      list = list.filter(b => obs.has(b.id));
    }
    if (sortMode() === "alpha") {
      return [...list].sort((a, b) => a.swedish.localeCompare(b.swedish, "sv"));
    }
    return list;
  });

  const groupedByFamily = createMemo(() => {
    if (sortMode() !== "family") return null;
    const birds = filteredBirds();
    const groups = new Map<string, Bird[]>();
    for (const b of birds) {
      if (!groups.has(b.family)) groups.set(b.family, []);
      groups.get(b.family)!.push(b);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "sv"));
  });

  const observedCount = createMemo(() => observedSet().size);
  const totalCount = createMemo(() => data()?.birds.length ?? 0);

  async function handleQuickAdd(addData: { note?: string; location?: string; eventId?: string }) {
    const bird = quickAddBird();
    if (!bird) return;
    await observations.create({
      birdId: bird.id,
      note: addData.note,
      location: addData.location,
      eventId: addData.eventId,
    });
    setQuickAddBird(null);
    refetch();
  }

  function firstObsDate(birdId: string): string | null {
    const d = data();
    if (!d || !d.observed[birdId]) return null;
    const dates = d.observed[birdId];
    if (timeFilter() === "year") {
      const yearDates = dates.filter(date => new Date(date).getFullYear() === currentYear);
      return yearDates.length > 0 ? yearDates[0] : null;
    }
    return dates[0] ?? null;
  }

  function renderBirdRow(bird: Bird) {
    const isObserved = observedSet().has(bird.id);
    const date = firstObsDate(bird.id);
    return (
      <div
        class={styles.birdRow}
        classList={{ [styles.unobserved]: !isObserved }}
      >
        <div class={styles.birdLink}>
          <div class={styles.birdInfo}>
            <span class={styles.birdName}>{bird.swedish}</span>
            <span class={styles.birdLatin}>{bird.id}</span>
          </div>
          <Show when={date}>
            <span class={styles.birdDate}>
              {new Date(date!).toLocaleDateString("sv-SE")}
            </span>
          </Show>
        </div>
        <Show when={isObserved}>
          <span class={styles.checkMark}>
            <Icon name="check_circle" size={20} />
          </span>
        </Show>
        <Show when={!isObserved}>
          <button
            class={styles.addBtn}
            onClick={() => setQuickAddBird(bird)}
            aria-label={`Kryssa ${bird.swedish}`}
          >
            <Icon name="add_circle_outline" size={20} />
          </button>
        </Show>
      </div>
    );
  }

  return (
    <div class={styles.page}>
      <h1 class={styles.heading}>Mina kryss</h1>

      <Show when={data()}>
        <div class={styles.summary}>
          <span class={styles.summaryCount}>{observedCount()}</span>
          <span class={styles.summaryLabel}>
            av {totalCount()} arter {timeFilter() === "year" ? `(${currentYear})` : "(totalt)"}
          </span>
        </div>

        {/* Controls */}
        <div class={styles.controls}>
          <div class={styles.controlGroup}>
            <button
              class={styles.controlBtn}
              classList={{ [styles.controlActive]: showMode() === "all" }}
              onClick={() => updateShowMode("all")}
            >
              Alla
            </button>
            <button
              class={styles.controlBtn}
              classList={{ [styles.controlActive]: showMode() === "observed" }}
              onClick={() => updateShowMode("observed")}
            >
              Observerade
            </button>
          </div>
          <div class={styles.controlGroup}>
            <button
              class={styles.controlBtn}
              classList={{ [styles.controlActive]: timeFilter() === "all" }}
              onClick={() => updateTimeFilter("all")}
            >
              Alla år
            </button>
            <button
              class={styles.controlBtn}
              classList={{ [styles.controlActive]: timeFilter() === "year" }}
              onClick={() => updateTimeFilter("year")}
            >
              {currentYear}
            </button>
          </div>
          <div class={styles.controlGroup}>
            <button
              class={styles.controlBtn}
              classList={{ [styles.controlActive]: sortMode() === "alpha" }}
              onClick={() => updateSortMode("alpha")}
            >
              A-Ö
            </button>
            <button
              class={styles.controlBtn}
              classList={{ [styles.controlActive]: sortMode() === "family" }}
              onClick={() => updateSortMode("family")}
            >
              Familj
            </button>
          </div>
        </div>

        {/* Bird list */}
        <Show
          when={filteredBirds().length > 0}
          fallback={
            <EmptyState
              icon="search_off"
              message="Inga fåglar matchar dina filter"
            />
          }
        >
          <Show
            when={sortMode() === "family" && groupedByFamily()}
            fallback={
              <div class={styles.birdList}>
                <For each={filteredBirds()}>
                  {(bird) => renderBirdRow(bird)}
                </For>
              </div>
            }
          >
            <div class={styles.birdList}>
              <For each={groupedByFamily()!}>
                {([family, birds]) => (
                  <>
                    <div class={styles.familyHeader}>{family}</div>
                    <For each={birds}>
                      {(bird) => renderBirdRow(bird)}
                    </For>
                  </>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>

      <Show when={!data() && isLoggedIn()}>
        <EmptyState icon="checklist" message="Laddar artlista..." />
      </Show>

      <QuickAddSheet
        bird={quickAddBird()}
        open={quickAddBird() !== null}
        onClose={() => setQuickAddBird(null)}
        onConfirm={handleQuickAdd}
        activeEvents={activeEvents() ?? []}
      />
    </div>
  );
}
