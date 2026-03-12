import { createResource, Show, For, onMount } from "solid-js";
import { stats as statsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import styles from "./StatsPage.module.css";

export default function StatsPage() {
  const { isLoggedIn, requestLogin } = useAuth();

  onMount(() => {
    if (!isLoggedIn()) requestLogin();
  });

  const [myStats] = createResource(() => isLoggedIn(), () => statsApi.me());

  return (
    <div class={styles.page}>
      <h1 class={styles.heading}>Min statistik</h1>

      <Show
        when={myStats()}
        fallback={<EmptyState icon="bar_chart" message="Laddar statistik..." />}
      >
        {(s) => (
          <>
            <div class={styles.grid}>
              <StatCard value={s().uniqueSpeciesLifetime} label="Arter totalt" highlight />
              <StatCard value={s().uniqueSpeciesThisYear} label="Arter i ar" />
              <StatCard value={s().totalObservations} label="Observationer" />
              <StatCard value={s().observationsThisWeek} label="Denna vecka" />
              <StatCard value={s().observationsThisMonth} label="Denna manad" />
            </div>

            <Show when={s().topFamilies.length > 0}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>Topp familjer</h2>
                <div class={styles.families}>
                  <For each={s().topFamilies}>
                    {(f) => (
                      <div class={styles.familyRow}>
                        <span>{f.family}</span>
                        <span class={styles.familyCount}>{f.count}</span>
                      </div>
                    )}
                  </For>
                </div>
              </section>
            </Show>
          </>
        )}
      </Show>

    </div>
  );
}
