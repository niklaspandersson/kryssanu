import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { useAuth } from "../lib/auth";
import styles from "./Home.module.css";

export default function Home() {
  const { user, signIn, signOut } = useAuth();

  return (
    <main class={styles.main}>
      <div class={styles.container}>
        <h1 class={styles.title}>
          Kryssa<span class={styles.pinkSpan}>.nu</span>
        </h1>
        <div class={styles.showcaseContainer}>
          <div class={styles.authContainer}>
            <Show when={user()}>
              <p class={styles.showcaseText}>
                <A href="/list">Gå till listan</A>
              </p>
            </Show>
            <button
              class={styles.loginButton}
              onClick={user() ? () => signOut() : signIn}
            >
              {user() ? "Sign out" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
