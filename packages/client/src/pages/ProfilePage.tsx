import { Show, For, createResource, createSignal, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import { stats as statsApi, users as usersApi } from "../lib/api";
import Avatar from "../components/Avatar";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import type { User, StatsComparison } from "@kryssanu/shared";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, isLoggedIn, requestLogin, signOut, updateUser } = useAuth();
  const [searchQuery, setSearchQuery] = createSignal("");
  const [comparison, setComparison] = createSignal<StatsComparison | null>(null);
  const [editing, setEditing] = createSignal(false);
  const [city, setCity] = createSignal("");
  const [about, setAbout] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  onMount(() => {
    if (!isLoggedIn()) requestLogin();
  });

  const [myStats] = createResource(() => isLoggedIn(), () => statsApi.me());
  const [searchResults] = createResource(
    () => searchQuery().length >= 2 ? searchQuery() : null,
    (q) => usersApi.search(q)
  );

  function startEditing() {
    const u = user();
    if (u) {
      setCity(u.city ?? "");
      setAbout(u.about ?? "");
      setEditing(true);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({
        city: city() || undefined,
        about: about() || undefined,
      });
      updateUser(updated);
      setEditing(false);
    } catch (e) {
      console.error("Failed to save profile", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleCompare(u: User) {
    setSearchQuery("");
    const result = await statsApi.compare(u.id);
    setComparison(result);
  }

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
              <Show when={!editing() && u().city}>
                <span class={styles.city}>{u().city}</span>
              </Show>
              <Show when={!editing() && u().about}>
                <p class={styles.about}>{u().about}</p>
              </Show>
            </div>

            <Show
              when={editing()}
              fallback={
                <button class={styles.editBtn} onClick={startEditing}>
                  Redigera profil
                </button>
              }
            >
              <div class={styles.editForm}>
                <label class={styles.label}>Stad</label>
                <input
                  type="text"
                  class={styles.input}
                  placeholder="Din stad..."
                  value={city()}
                  onInput={(e) => setCity(e.currentTarget.value)}
                  maxLength={100}
                />
                <label class={styles.label}>Om mig</label>
                <textarea
                  class={styles.textarea}
                  placeholder="Berätta lite om dig..."
                  value={about()}
                  onInput={(e) => setAbout(e.currentTarget.value)}
                  maxLength={500}
                  rows={3}
                />
                <div class={styles.editActions}>
                  <button
                    class={styles.cancelBtn}
                    onClick={() => setEditing(false)}
                    disabled={saving()}
                  >
                    Avbryt
                  </button>
                  <button
                    class={styles.saveBtn}
                    onClick={saveProfile}
                    disabled={saving()}
                  >
                    {saving() ? "Sparar..." : "Spara"}
                  </button>
                </div>
              </div>
            </Show>

            <button class={styles.signOutBtn} onClick={signOut}>
              Logga ut
            </button>
          </div>
        )}
      </Show>

      {/* Stats */}
      <Show when={myStats()}>
        {(s) => (
          <>
            <h2 class={styles.sectionTitle}>Min statistik</h2>
            <div class={styles.statsGrid}>
              <StatCard value={s().uniqueSpeciesLifetime} label="Arter totalt" highlight />
              <StatCard value={s().uniqueSpeciesThisYear} label="Arter i år" />
              <StatCard value={s().totalObservations} label="Observationer" />
              <StatCard value={s().observationsThisWeek} label="Denna vecka" />
              <StatCard value={s().observationsThisMonth} label="Denna månad" />
            </div>

            <Show when={s().topFamilies.length > 0}>
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
            </Show>
          </>
        )}
      </Show>

      {/* Compare */}
      <section class={styles.section}>
        <h2 class={styles.sectionTitle}>Jämför med...</h2>
        <input
          type="text"
          class={styles.searchInput}
          placeholder="Sök efter användare..."
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
              <CompRow label="Arter i år" a={comp().me.uniqueSpeciesThisYear} b={comp().other.uniqueSpeciesThisYear} />
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
