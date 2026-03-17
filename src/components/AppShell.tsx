import { createSignal, createResource, createMemo, Show } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import type { Bird } from "../lib/types";
import { birds, observations } from "../lib/api";
import TopNav from "./TopNav";
import SearchResults from "./SearchResults";
import QuickAddSheet from "./search/QuickAddSheet";
import SideDrawer from "./SideDrawer";
import styles from "./AppShell.module.css";

const [searchOpen, setSearchOpen] = createSignal(false);
const [menuOpen, setMenuOpen] = createSignal(false);

export function openSearch() {
  setSearchOpen(true);
}

export default function AppShell(props: RouteSectionProps) {
  const { user, isLoggedIn, showOneTap } = useAuth();

  const [query, setQuery] = createSignal("");
  const [selectedBird, setSelectedBird] = createSignal<Bird | null>(null);
  const [sheetOpen, setSheetOpen] = createSignal(false);

  const [allBirds] = createResource(() => searchOpen(), (open) => open ? birds.getAll() : undefined);
  const [observedBirds, { mutate: setObserved }] = createResource(
    () => searchOpen() && user(),
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

  async function handleConfirm(data: { note?: string; location?: string }) {
    const bird = selectedBird();
    if (!bird) return;
    await observations.create({ birdId: bird.id, ...data });
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
      <TopNav
        searchOpen={searchOpen()}
        query={query()}
        onQueryChange={setQuery}
        onSearchOpen={() => setSearchOpen(true)}
        onSearchClose={handleSearchClose}
        onMenuOpen={() => setMenuOpen(true)}
      />
      <Show when={isLoggedIn()}>
        <SideDrawer open={menuOpen()} onClose={() => setMenuOpen(false)} />
      </Show>
      <div class={styles.mainArea}>
        <main class={styles.content}>
          <Show when={searchOpen()} fallback={props.children}>
            <SearchResults
              query={query()}
              filtered={filtered()}
              observedBirds={observedBirds() ?? {}}
              onAdd={handleAdd}
            />
          </Show>
        </main>
      </div>
      <Show when={!searchOpen()}>
        <footer class={styles.footer}>
          <nav class={styles.footerLinks}>
            <A href="/about">Om kryssa.nu</A>
            <A href="/help">Hjälp</A>
            <A href="/terms">Villkor</A>
          </nav>
        </footer>
      </Show>
      <QuickAddSheet
        bird={selectedBird()}
        open={sheetOpen()}
        onClose={() => setSheetOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
