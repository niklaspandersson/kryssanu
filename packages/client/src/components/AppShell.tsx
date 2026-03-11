import { createSignal } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import TopNav from "./TopNav";
import SearchOverlay from "./SearchOverlay";
import styles from "./AppShell.module.css";

const [searchOpen, setSearchOpen] = createSignal(false);

export function openSearch() {
  setSearchOpen(true);
}

export default function AppShell(props: RouteSectionProps) {
  return (
    <div class={styles.shell}>
      <TopNav onSearchOpen={() => setSearchOpen(true)} />
      <main class={styles.content}>{props.children}</main>
      <SearchOverlay open={searchOpen()} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
