import { createSignal, createResource, createMemo, createEffect, on, Show, ErrorBoundary } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import type { Bird } from "../lib/types";
import { me as meApi } from "../lib/api";
import { allBirds } from "../lib/birdStore";
import { selectableTaxa } from "../lib/birds";
import { readSettings } from "../lib/settings";
import { userLists, refreshLists } from "../lib/listStore";
import { isOnline } from "../lib/useOnlineStatus";
import { pendingObs } from "../lib/offlineDb";
import { refreshPendingCount } from "../lib/offlineSync";
import { notifyObservationCreated } from "../lib/observationStore";
import TopNav from "./TopNav";
import SearchSheet from "./search/SearchSheet";
import QuickAddSheet from "./search/QuickAddSheet";
import SideDrawer from "./SideDrawer";
import OfflineBanner from "./OfflineBanner";
import UpdatePrompt from "./UpdatePrompt";
import styles from "./AppShell.module.css";

const [searchOpen, setSearchOpen] = createSignal(false);
const [menuOpen, setMenuOpen] = createSignal(false);
const [fabHidden, setFabHidden] = createSignal(false);

export function openSearch() {
  setSearchOpen(true);
}

/** Pages can hide the floating search FAB while a competing bottom UI is shown. */
export function setSearchFabHidden(hidden: boolean) {
  setFabHidden(hidden);
}

export default function AppShell(props: RouteSectionProps) {
  const { user, isLoggedIn, showOneTap } = useAuth();

  const [query, setQuery] = createSignal("");
  const [selectedBird, setSelectedBird] = createSignal<Bird | null>(null);
  const [sheetOpen, setSheetOpen] = createSignal(false);

  const [observedBirds, { mutate: setObserved }] = createResource(
    () => searchOpen() && user(),
    async () => {
      try {
        return await meApi.observed();
      } catch {
        return {};
      }
    }
  );

  // Tracks connectivity, but does not gate on it. fetchJson serves GETs from
  // the cache while offline, so refreshLists() succeeds without a network at
  // all — skipping the call when offline would throw away the one mechanism
  // that makes the list available there. Re-running on the online edge just
  // replaces the cached copy with a fresh one.
  createEffect(
    on([isLoggedIn, isOnline], ([loggedIn]) => {
      if (loggedIn) refreshLists();
    })
  );

  // A one-character query matches most of the ~1300-taxon catalog, and this
  // re-runs on every keystroke, so cap what reaches the DOM. matchCount is kept
  // so the sheet can say the result set was trimmed rather than silently
  // showing a partial list.
  const MAX_SEARCH_RESULTS = 50;

  const matches = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return [];
    const list = selectableTaxa(allBirds(), readSettings(user()).showSubspecies);
    return list.filter(
      (b) =>
        b.swedish.toLowerCase().includes(q) ||
        b.family.toLowerCase().includes(q)
    );
  });

  const filtered = createMemo(() => matches().slice(0, MAX_SEARCH_RESULTS));

  function handleAdd(bird: Bird) {
    if (!isLoggedIn()) {
      showOneTap(() => {
        setSelectedBird(bird);
        setSheetOpen(true);
      });
      return;
    }
    setSelectedBird(bird);
    setSheetOpen(true);
  }

  async function handleConfirm(data: { note?: string; location?: string; latitude?: number; longitude?: number; listIds?: string[] }) {
    const bird = selectedBird();
    if (!bird) return;

    if (isOnline()) {
      await meApi.createObservation({ birdId: bird.id, ...data });
      notifyObservationCreated();
    } else {
      await pendingObs.add({
        id: crypto.randomUUID(),
        birdId: bird.id,
        birdName: bird.swedish,
        note: data.note,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: new Date().toISOString(),
      });
      await refreshPendingCount();
    }

    setObserved((prev) => ({ ...prev, [bird.id]: true }));
    setSheetOpen(false);
    setSelectedBird(null);
  }

  function handleSearchClose() {
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <div class={styles.shell} classList={{ [styles.noSidebar]: !isLoggedIn() }}>
      <TopNav onMenuOpen={() => setMenuOpen(true)} />
      <Show when={isLoggedIn()}>
        <SideDrawer open={menuOpen()} onClose={() => setMenuOpen(false)} />
      </Show>
      <div class={styles.mainArea}>
        <OfflineBanner />
        <main class={styles.content}>
          <ErrorBoundary fallback={
            <div style={{ padding: '2rem', "text-align": 'center', color: 'var(--text-secondary, #666)' }}>
              <p>Kunde inte ladda sidan. Kontrollera din internetanslutning och försök igen.</p>
            </div>
          }>
            {props.children}
          </ErrorBoundary>
        </main>
      </div>
      <footer class={styles.footer}>
        <nav class={styles.footerLinks}>
          <A href="/about">Om kryssa.nu</A>
          <A href="/help">Hjälp</A>
          <A href="/terms">Villkor</A>
        </nav>
      </footer>
      <Show when={!searchOpen() && !fabHidden()}>
        <button
          class={styles.fab}
          onClick={() => setSearchOpen(true)}
          aria-label="Sök"
        >
          <span class="md-icon">search</span>
        </button>
      </Show>
      <SearchSheet
        open={searchOpen()}
        onClose={handleSearchClose}
        query={query()}
        onQueryChange={setQuery}
        filtered={filtered()}
        matchCount={matches().length}
        observedBirds={observedBirds() ?? {}}
        onAdd={handleAdd}
        onNavigate={handleSearchClose}
      />
      <UpdatePrompt />
      <QuickAddSheet
        bird={selectedBird()}
        open={sheetOpen()}
        lists={userLists()}
        onClose={() => setSheetOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
