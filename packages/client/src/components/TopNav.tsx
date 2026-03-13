import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import styles from "./TopNav.module.css";

type Props = {
  onSearchOpen: () => void;
  onMenuOpen: () => void;
};

export default function TopNav(props: Props) {
  const { user, isLoggedIn } = useAuth();

  return (
    <nav class={styles.nav}>
      <div class={styles.left}>
        <Show when={isLoggedIn()}>
          <button class={`${styles.iconBtn} ${styles.menuBtn}`} onClick={() => props.onMenuOpen()} aria-label="Meny">
            <span class="md-icon">menu</span>
          </button>
        </Show>
        <A href="/" class={styles.brand}>
          <span class={`md-icon ${styles.brandIcon}`}>park</span>
          Kryssa.nu
        </A>
      </div>

      <div class={styles.actions}>
        <button class={styles.iconBtn} onClick={() => props.onSearchOpen()} aria-label="Sök">
          <span class="md-icon">search</span>
        </button>
        <Show when={isLoggedIn()}>
          <A href="/profile" class={styles.profileBtn}>
            <Avatar name={user()!.name} image={user()!.image} size={28} />
          </A>
        </Show>
      </div>
    </nav>
  );
}
