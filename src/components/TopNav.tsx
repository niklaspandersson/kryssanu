import { createEffect, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import styles from "./TopNav.module.css";

type Props = {
  onMenuOpen: () => void;
};

export default function TopNav(props: Props) {
  const { user, isLoggedIn, loading, renderGoogleButton } = useAuth();
  let loginRef!: HTMLDivElement;

  onMount(() => {
    if (!isLoggedIn() && !loading()) renderGoogleButton(loginRef);
  });

  createEffect(() => {
    if (!loading() && !isLoggedIn() && loginRef) {
      renderGoogleButton(loginRef);
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
          <span class={styles.brandText}>kryssa.nu</span>
        </A>
      </div>

      <div class={styles.actions}>
        <Show when={isLoggedIn()} fallback={
          <Show when={!loading()}>
            <div ref={loginRef} class={styles.loginBtn} />
          </Show>
        }>
          <A href="/profile" class={styles.profileBtn}>
            <Avatar name={user()!.name} image={user()!.image} size={28} />
          </A>
        </Show>
      </div>
    </nav>
  );
}
