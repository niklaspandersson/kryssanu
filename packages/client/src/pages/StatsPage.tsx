import { createSignal, createResource, Show, For, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { stats as statsApi, users as usersApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import StatCard from "../components/StatCard";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import type { User, StatsComparison } from "@kryssanu/shared";
import styles from "./StatsPage.module.css";

export default function StatsPage() {
  const { isLoggedIn, requestLogin } = useAuth();
  const [searchQuery, setSearchQuery] = createSignal("");
  const [comparison, setComparison] = createSignal<StatsComparison | null>(null);

  onMount(() => {
    if (!isLoggedIn()) requestLogin();
  });

  const [myStats] = createResource(() => isLoggedIn(), () => statsApi.me());
  const [searchResults] = createResource(
    () => searchQuery().length >= 2 ? searchQuery() : null,
    (q) => usersApi.search(q)
  );

  async function handleCompare(user: User) {
    setSearchQuery("");
    const result = await statsApi.compare(user.id);
    setComparison(result);
  }

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

      {/* Compare */}
      <section class={styles.section}>
        <h2 class={styles.sectionTitle}>Jamfor med...</h2>
        <input
          type="text"
          class={styles.searchInput}
          placeholder="Sok efter anvandare..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
        />
        <Show when={(searchResults() ?? []).length > 0}>
          <div class={styles.userList}>
            <For each={searchResults()}>
              {(u) => (
                <button class={styles.userRow} onClick={() => handleCompare(u)}>
                  <Avatar name={u.name} image={u.image} size={32} />
                  <span>{u.name}</span>
                </button>
              )}
            </For>
          </div>
        </Show>
      </section>

      {/* Comparison result */}
      <Show when={comparison()}>
        {(comp) => (
          <section class={styles.comparison}>
            <div class={styles.compHeader}>
              <span class={styles.compLabel}>Du</span>
              <span>vs</span>
              <A href={`/stats/${comp().otherUser.id}`} class={styles.compLabel}>
                {comp().otherUser.name}
              </A>
            </div>
            <div class={styles.compGrid}>
              <CompRow label="Arter totalt" a={comp().me.uniqueSpeciesLifetime} b={comp().other.uniqueSpeciesLifetime} />
              <CompRow label="Arter i ar" a={comp().me.uniqueSpeciesThisYear} b={comp().other.uniqueSpeciesThisYear} />
              <CompRow label="Observationer" a={comp().me.totalObservations} b={comp().other.totalObservations} />
              <CompRow label="Denna vecka" a={comp().me.observationsThisWeek} b={comp().other.observationsThisWeek} />
            </div>
          </section>
        )}
      </Show>
    </div>
  );
}

function CompRow(props: { label: string; a: number; b: number }) {
  return (
    <div class={styles.compRow}>
      <span
        class={styles.compValue}
        classList={{ [styles.winner]: props.a > props.b }}
      >
        {props.a}
      </span>
      <span class={styles.compRowLabel}>{props.label}</span>
      <span
        class={styles.compValue}
        classList={{ [styles.winner]: props.b > props.a }}
      >
        {props.b}
      </span>
    </div>
  );
}
