import { createSignal, createResource, createMemo, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { me as meApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { allBirds, birdsReady } from "../lib/birdStore";
import { isOnline } from "../lib/useOnlineStatus";
import { pendingObs } from "../lib/offlineDb";
import { refreshPendingCount } from "../lib/offlineSync";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import BottomSheet from "../components/BottomSheet";
import QuickAddSheet from "../components/search/QuickAddSheet";
import type { Bird } from "../lib/types";
import shared from "../styles/shared.module.css";
import styles from "./BirdsPage.module.css";

type ShowMode = "all" | "observed";
type TimeFilter = "all" | "year";
type SortMode = "alpha" | "family" | "chrono";

export default function BirdsPage() {
  const { isLoggedIn } = useAuth();

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
  const [filtersOpen, setFiltersOpen] = createSignal(false);

  function persistFilters(show: ShowMode, time: TimeFilter, sort: SortMode) {
    localStorage.setItem("mybirds-filters", JSON.stringify({ show, time, sort }));
  }

  function updateShowMode(v: ShowMode) { setShowMode(v); persistFilters(v, timeFilter(), sortMode()); }
  function updateTimeFilter(v: TimeFilter) { setTimeFilter(v); persistFilters(showMode(), v, sortMode()); }
  function updateSortMode(v: SortMode) { setSortMode(v); persistFilters(showMode(), timeFilter(), v); }
  const [quickAddBird, setQuickAddBird] = createSignal<Bird | null>(null);
  const [observed, { refetch }] = createResource(() => isLoggedIn(), (loggedIn) =>
    loggedIn ? meApi.checklist() : undefined
  );

  const currentYear = new Date().getFullYear();

  const observedSet = createMemo(() => {
    const d = observed();
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

  function latestObsDate(birdId: string): string | null {
    const d = observed();
    if (!d || !d.observed[birdId]) return null;
    const dates = d.observed[birdId];
    if (timeFilter() === "year") {
      const yearDates = dates.filter(date => new Date(date).getFullYear() === currentYear);
      return yearDates.length > 0 ? yearDates[yearDates.length - 1] : null;
    }
    return dates[dates.length - 1] ?? null;
  }

  const filteredBirds = createMemo(() => {
    const birds = allBirds();
    if (birds.length === 0) return [];
    const obs = observedSet();
    let list = birds;
    if (showMode() === "observed") {
      list = list.filter(b => obs.has(b.id));
    }
    if (sortMode() === "alpha") {
      return [...list].sort((a, b) => a.swedish.localeCompare(b.swedish, "sv"));
    }
    if (sortMode() === "chrono") {
      const observedBirds: Bird[] = [];
      const unobservedBirds: Bird[] = [];
      for (const b of list) {
        if (obs.has(b.id)) observedBirds.push(b);
        else unobservedBirds.push(b);
      }
      observedBirds.sort((a, b) => {
        const da = latestObsDate(a.id);
        const db = latestObsDate(b.id);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      });
      unobservedBirds.sort((a, b) => a.swedish.localeCompare(b.swedish, "sv"));
      return [...observedBirds, ...unobservedBirds];
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
  const totalCount = createMemo(() => allBirds().length);

  async function handleQuickAdd(addData: { note?: string; location?: string }) {
    const bird = quickAddBird();
    if (!bird) return;

    if (isOnline()) {
      await meApi.createObservation({
        birdId: bird.id,
        note: addData.note,
        location: addData.location,
      });
    } else {
      await pendingObs.add({
        id: crypto.randomUUID(),
        birdId: bird.id,
        birdName: bird.swedish,
        note: addData.note,
        location: addData.location,
        createdAt: new Date().toISOString(),
      });
      await refreshPendingCount();
    }

    setQuickAddBird(null);
    refetch();
  }

  function displayObsDate(birdId: string): string | null {
    const d = observed();
    if (!d || !d.observed[birdId]) return null;
    const dates = d.observed[birdId];
    const pool = timeFilter() === "year"
      ? dates.filter(date => new Date(date).getFullYear() === currentYear)
      : dates;
    if (pool.length === 0) return null;
    return sortMode() === "chrono" ? pool[pool.length - 1] : pool[0];
  }

  const filtersActive = createMemo(
    () => showMode() !== "all" || timeFilter() !== "all" || sortMode() !== "alpha"
  );

  function sortLabel(mode: SortMode): string {
    if (mode === "alpha") return "A–Ö";
    if (mode === "family") return "Familj";
    return "Senast först";
  }

  function renderBirdRow(bird: Bird) {
    const isObserved = () => observedSet().has(bird.id);
    const date = () => displayObsDate(bird.id);
    return (
      <div
        class={styles.birdRow}
        classList={{ [styles.unobserved]: !isObserved() }}
      >
        <div class={styles.birdLink}>
          <div class={styles.birdInfo}>
            <span class={styles.birdName}>{bird.swedish}</span>
            <span class={styles.birdLatin}>{bird.id}</span>
          </div>
          <Show when={date()}>
            <span class={styles.birdDate}>
              {new Date(date()!).toLocaleDateString("sv-SE")}
            </span>
          </Show>
        </div>
        <Show when={isObserved()}>
          <span class={styles.checkMark}>
            <Icon name="check_circle" size={20} />
          </span>
        </Show>

          <button
            class={styles.addBtn}
            onClick={() => setQuickAddBird(bird)}
            aria-label={`Kryssa ${bird.swedish}`}
          >
            <Icon name="add_circle_outline" size={20} />
          </button>

      </div>
    );
  }

  return (
    <div class={shared.page}>
      <h1 class={shared.headingMd}>Mina kryss</h1>

      <Show when={birdsReady() && allBirds().length > 0}>
        <div class={styles.toolbar}>
          <div class={styles.summary}>
            <span class={styles.summaryCount}>{observedCount()}</span>
            <span class={styles.summaryLabel}>(arter observerade
               {timeFilter() === "year" ? ` ${currentYear}` : " totalt"})
            </span>
          </div>

          <div class={styles.toolbarActions}>
            <button
              type="button"
              class={styles.filterBtn}
              classList={{ [styles.filterBtnActive]: filtersActive() }}
              onClick={() => setFiltersOpen(true)}
              aria-label="Filtrera och sortera"
            >
              <Icon name="tune" size={18} />
              <span class={styles.filterBtnLabel}>Filter</span>
              <Show when={filtersActive()}>
                <span class={styles.filterDot} aria-hidden="true" />
              </Show>
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

      <Show when={!birdsReady() && isLoggedIn()}>
        <EmptyState icon="checklist" message="Laddar artlista..." />
      </Show>

      <BottomSheet
        open={filtersOpen()}
        onClose={() => setFiltersOpen(false)}
        title="Filtrera & sortera"
      >
        <div class={styles.sheetContent}>
          <div class={styles.sheetSection}>
            <div class={styles.sheetLabel}>Visa</div>
            <div class={styles.sheetSegmented}>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: showMode() === "all" }}
                onClick={() => updateShowMode("all")}
              >
                Alla
              </button>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: showMode() === "observed" }}
                onClick={() => updateShowMode("observed")}
              >
                Observerade
              </button>
            </div>
          </div>

          <div class={styles.sheetSection}>
            <div class={styles.sheetLabel}>Tidsperiod</div>
            <div class={styles.sheetSegmented}>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: timeFilter() === "all" }}
                onClick={() => updateTimeFilter("all")}
              >
                Alla år
              </button>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: timeFilter() === "year" }}
                onClick={() => updateTimeFilter("year")}
              >
                {currentYear}
              </button>
            </div>
          </div>

          <div class={styles.sheetSection}>
            <div class={styles.sheetLabel}>Sortering</div>
            <div class={styles.sheetSegmented}>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: sortMode() === "alpha" }}
                onClick={() => updateSortMode("alpha")}
              >
                {sortLabel("alpha")}
              </button>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: sortMode() === "family" }}
                onClick={() => updateSortMode("family")}
              >
                {sortLabel("family")}
              </button>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: sortMode() === "chrono" }}
                onClick={() => updateSortMode("chrono")}
              >
                {sortLabel("chrono")}
              </button>
            </div>
          </div>

          <button
            type="button"
            class={styles.sheetDoneBtn}
            onClick={() => setFiltersOpen(false)}
          >
            Klar
          </button>
        </div>
      </BottomSheet>

      <QuickAddSheet
        bird={quickAddBird()}
        open={quickAddBird() !== null}
        onClose={() => setQuickAddBird(null)}
        onConfirm={handleQuickAdd}
      />
    </div>
  );
}
