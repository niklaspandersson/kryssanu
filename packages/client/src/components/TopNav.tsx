import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import styles from "./TopNav.module.css";

type Props = {
  onSearchOpen: () => void;
  onMenuOpen: () => void;
};

export default function TopNav(props: Props) {
  const { user } = useAuth();

  return (
    <nav class={styles.nav}>
      <div class={styles.left}>
        <button class={styles.iconBtn} onClick={() => props.onMenuOpen()} aria-label="Meny">
          <span class="md-icon">menu</span>
        </button>
        <A href="/" class={styles.brand}>
          <span class={`md-icon ${styles.brandIcon}`}>park</span>
          Kryssa.nu
        </A>
      </div>

      <div class={styles.actions}>
        <button class={styles.iconBtn} onClick={() => props.onSearchOpen()} aria-label="Sök">
          <span class="md-icon">search</span>
        </button>
        <A href="/profile" class={styles.profileBtn}>
          {user() ? (
            <Avatar name={user()!.name} image={user()!.image} size={28} />
          ) : (
            <span class="md-icon">person</span>
          )}
        </A>
      </div>
    </nav>
  );
}
