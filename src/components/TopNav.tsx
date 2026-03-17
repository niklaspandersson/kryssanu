import { createEffect, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import styles from "./TopNav.module.css";

type Props = {
  searchOpen: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onMenuOpen: () => void;
};

export default function TopNav(props: Props) {
  const { user, isLoggedIn } = useAuth();
  let inputRef!: HTMLInputElement;

  createEffect(() => {
    if (props.searchOpen) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  return (
    <nav class={styles.nav}>
      <div class={styles.left}>
        <Show when={isLoggedIn()}>
          <button class={`${styles.iconBtn} ${styles.menuBtn}`} onClick={() => props.onMenuOpen()} aria-label="Meny">
            <span class="md-icon">menu</span>
          </button>
        </Show>
        <A href="/" class={styles.brand}>
          <img src="/logo-v2-solid.webp" alt="" class={styles.brandLogo} />
          <Show when={!props.searchOpen}>
            <span class={styles.brandText}>kryssa.nu</span>
          </Show>
        </A>
      </div>

      <Show when={props.searchOpen}>
        <div class={styles.searchBar}>
          <button class={styles.searchBarBtn} onClick={() => props.onSearchClose()} aria-label="Tillbaka">
            <span class="md-icon">arrow_back</span>
          </button>
          <input
            ref={inputRef}
            type="text"
            class={styles.searchInput}
            placeholder="Sök efter fågel..."
            value={props.query}
            onInput={(e) => props.onQueryChange(e.currentTarget.value)}
          />
          <button class={styles.searchBarBtn} onClick={() => props.onSearchClose()} aria-label="Stäng sök">
            <span class="md-icon">close</span>
          </button>
        </div>
      </Show>

      <div class={styles.actions}>
        <Show when={!props.searchOpen}>
          <button class={styles.iconBtn} onClick={() => props.onSearchOpen()} aria-label="Sök">
            <span class="md-icon">search</span>
          </button>
        </Show>
        <Show when={isLoggedIn()}>
          <A href="/profile" class={styles.profileBtn}>
            <Avatar name={user()!.name} image={user()!.image} size={28} />
          </A>
        </Show>
      </div>
    </nav>
  );
}
