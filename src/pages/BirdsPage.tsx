import { createSignal, createResource, createMemo, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { me as meApi } from "../lib/api";
import { userLists } from "../lib/listStore";
import { useAuth } from "../lib/auth";
import { allBirds, birdsReady } from "../lib/birdStore";
import { isOnline } from "../lib/useOnlineStatus";
import { pendingObs } from "../lib/offlineDb";
import { refreshPendingCount } from "../lib/offlineSync";
import { notifyObservationCreated } from "../lib/observationStore";
import Icon from "../components/Icon";
import ObserveButton from "../components/ObserveButton";
import EmptyState from "../components/EmptyState";
import BottomSheet from "../components/BottomSheet";
import QuickAddSheet from "../components/search/QuickAddSheet";
import type { Bird } from "../lib/types";
import {
  INTRODUCED_TOOLTIP,
  RARITY_TOOLTIP,
  SUBSPECIES_TOOLTIP,
  isIntroduced,
  isOfficial,
  isRarity,
  isSubspecies,
  selectableTaxa,
} from "../lib/birds";
import { readSettings } from "../lib/settings";
import shared from "../styles/shared.module.css";
import styles from "./BirdsPage.module.css";

type ShowMode = "all" | "observed";
type TimeFilter = "all" | "year";
type SortMode = "alpha" | "family" | "chrono";

export default function BirdsPage() {
  const { user, isLoggedIn } = useAuth();

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
  const [includeVisitors, setIncludeVisitors] = createSignal<boolean>(stored.visitors ?? false);
  const [officialOnly, setOfficialOnly] = createSignal<boolean>(stored.official ?? true);
  const [filtersOpen, setFiltersOpen] = createSignal(false);

  function persistFilters() {
    localStorage.setItem("mybirds-filters", JSON.stringify({
      show: showMode(),
      time: timeFilter(),
      sort: sortMode(),
      visitors: includeVisitors(),
      official: officialOnly(),
    }));
  }

  function updateShowMode(v: ShowMode) { setShowMode(v); persistFilters(); }
  function updateTimeFilter(v: TimeFilter) { setTimeFilter(v); persistFilters(); }
  function updateSortMode(v: SortMode) { setSortMode(v); persistFilters(); }
  function updateIncludeVisitors(v: boolean) { setIncludeVisitors(v); persistFilters(); }
  function updateOfficialOnly(v: boolean) { setOfficialOnly(v); persistFilters(); }
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

    // Catalog shape first — but never drop a bird the user has already logged,
    // or an observed subspecies would silently vanish from their own checklist
    // while subspecies are hidden.
    const selectable = new Set(
      selectableTaxa(birds, readSettings(user()).showSubspecies).map(b => b.id),
    );
    let list = birds.filter(b => selectable.has(b.id) || obs.has(b.id));

    if (officialOnly()) {
      list = list.filter(isOfficial);
    }
    if (!includeVisitors()) {
      list = list.filter(b => !isRarity(b));
    }
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

  const observedCount = createMemo(() => {
    const obs = observedSet();
    if (includeVisitors() && !officialOnly()) return obs.size;
    // Keep the count consistent with the visible list.
    return allBirds().filter(
      b => obs.has(b.id) && (includeVisitors() || !isRarity(b)) && (!officialOnly() || isOfficial(b)),
    ).length;
  });

  async function handleQuickAdd(addData: { note?: string; location?: string; latitude?: number; longitude?: number; listIds?: string[]; image?: File }) {
    const bird = quickAddBird();
    if (!bird) return;

    if (isOnline()) {
      const created = await meApi.createObservation({
        birdId: bird.id,
        note: addData.note,
        location: addData.location,
        latitude: addData.latitude,
        longitude: addData.longitude,
        listIds: addData.listIds,
      });
      // Non-fatal: the observation is already saved if the image upload fails.
      if (addData.image) {
        try {
          await meApi.uploadObservationImage(created.id, addData.image);
        } catch (e) {
          console.error("Bilduppladdning misslyckades", e);
        }
      }
      notifyObservationCreated();
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
    () => showMode() !== "all" || timeFilter() !== "all" || sortMode() !== "alpha" || includeVisitors()
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
        <ObserveButton
          observed={isObserved()}
          onAdd={() => setQuickAddBird(bird)}
          birdName={bird.swedish}
        />
        <div class={styles.birdContent}>
          <A href={`/birds/${encodeURIComponent(bird.id)}`} class={styles.birdInfo}>
            <span class={styles.birdName}>
              {bird.swedish}
              <Show when={isRarity(bird)}>
                <span class={styles.visitorBadge} title={RARITY_TOOLTIP}>Raritet</span>
              </Show>
              <Show when={isIntroduced(bird)}>
                <span class={styles.introducedBadge} title={INTRODUCED_TOOLTIP}>Introducerad</span>
              </Show>
              <Show when={isSubspecies(bird)}>
                <span class={styles.subspeciesBadge} title={SUBSPECIES_TOOLTIP}>Underart</span>
              </Show>
            </span>
            <span class={styles.birdLatin}>
              {bird.id}
              <Show when={isSubspecies(bird)}>
                {(() => {
                  const parent = allBirds().find(b => b.id === bird.parentId);
                  return parent ? ` · underart av ${parent.swedish}` : "";
                })()}
              </Show>
            </span>
          </A>
          <Show when={date()}>
            <span class={styles.birdDate}>
              {new Date(date()!).toLocaleDateString("sv-SE")}
            </span>
          </Show>
        </div>
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
            </div>
          </div>

          <div class={styles.sheetSection}>
            <div class={styles.sheetLabel}>Lista</div>
            <div class={styles.sheetSegmented}>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: officialOnly() }}
                onClick={() => updateOfficialOnly(true)}
                title="Sveriges officiella fågellista"
              >
                Officiella
              </button>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: !officialOnly() }}
                onClick={() => updateOfficialOnly(false)}
                title="Alla arter som setts i Sverige"
              >
                Alla
              </button>
            </div>
          </div>

          <div class={styles.sheetSection}>
            <div class={styles.sheetLabel}>Rariteter</div>
            <div class={styles.sheetSegmented}>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: !includeVisitors() }}
                onClick={() => updateIncludeVisitors(false)}
              >
                Dölj
              </button>
              <button
                type="button"
                class={styles.controlBtn}
                classList={{ [styles.controlActive]: includeVisitors() }}
                onClick={() => updateIncludeVisitors(true)}
              >
                Visa
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
        lists={userLists()}
        onClose={() => setQuickAddBird(null)}
        onConfirm={handleQuickAdd}
      />
    </div>
  );
}
