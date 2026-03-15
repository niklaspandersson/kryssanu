import { createSignal, Show } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import TopNav from "./TopNav";
import SearchOverlay from "./SearchOverlay";
import SideDrawer from "./SideDrawer";
import styles from "./AppShell.module.css";

const [searchOpen, setSearchOpen] = createSignal(false);
const [menuOpen, setMenuOpen] = createSignal(false);

export function openSearch() {
  setSearchOpen(true);
}

export default function AppShell(props: RouteSectionProps) {
  const { isLoggedIn } = useAuth();

  return (
    <div class={styles.shell} classList={{ [styles.noSidebar]: !isLoggedIn() }}>
        <TopNav
          onSearchOpen={() => setSearchOpen(true)}
          onMenuOpen={() => setMenuOpen(true)}
        />
      <Show when={isLoggedIn()}>
        <SideDrawer open={menuOpen()} onClose={() => setMenuOpen(false)} />
      </Show>
      <div class={styles.mainArea}>
        <main class={styles.content}>{props.children}</main>
      </div>
      <footer class={styles.footer}>
        <nav class={styles.footerLinks}>
          <A href="/about">Om kryssa.nu</A>
          <A href="/help">Hjälp</A>
          <A href="/terms">Villkor</A>
        </nav>
      </footer>
      <SearchOverlay open={searchOpen()} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
