import { Show, For, createResource, createSignal } from "solid-js";
import { useAuth } from "../lib/auth";
import { stats as statsApi, users as usersApi } from "../lib/api";
import Avatar from "../components/Avatar";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, isLoggedIn, signOut, updateUser } = useAuth();
  const [editing, setEditing] = createSignal(false);
  const [city, setCity] = createSignal("");
  const [about, setAbout] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  const [myStats] = createResource(() => isLoggedIn(), () => statsApi.me());

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

    </div>
  );
}
