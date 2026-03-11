import { Show, onMount } from "solid-js";
import { useAuth } from "../lib/auth";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, isLoggedIn, requestLogin, signOut } = useAuth();

  onMount(() => {
    if (!isLoggedIn()) requestLogin();
  });

  return (
    <div class={styles.page}>
      <h1 class={styles.heading}>Profil</h1>
      <Show
        when={user()}
        fallback={<EmptyState icon="person" message="Loggar in..." />}
      >
        {(u) => (
          <div class={styles.card}>
            <Avatar name={u().name} image={u().image} size={72} />
            <div class={styles.info}>
              <span class={styles.name}>{u().name}</span>
              <span class={styles.email}>{u().email}</span>
            </div>
            <button class={styles.signOutBtn} onClick={signOut}>
              Logga ut
            </button>
          </div>
        )}
      </Show>
    </div>
  );
}
