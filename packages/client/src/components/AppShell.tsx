import { createSignal } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
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
  return (
    <div class={styles.shell}>
      <TopNav
        onSearchOpen={() => setSearchOpen(true)}
        onMenuOpen={() => setMenuOpen(true)}
      />
      <main class={styles.content}>{props.children}</main>
      <SearchOverlay open={searchOpen()} onClose={() => setSearchOpen(false)} />
      <SideDrawer open={menuOpen()} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
