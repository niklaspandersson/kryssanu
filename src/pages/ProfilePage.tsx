import { Show, For, createResource, createSignal, createEffect, onMount } from "solid-js";
import { useLocation } from "@solidjs/router";
import { useAuth } from "../lib/auth";
import { me as meApi, exportApi } from "../lib/api";
import { isOnline } from "../lib/useOnlineStatus";
import Avatar from "../components/Avatar";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, isLoggedIn, signOut, updateUser } = useAuth();
  const location = useLocation();
  const [editing, setEditing] = createSignal(false);
  const [city, setCity] = createSignal("");
  const [about, setAbout] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  const [myStats] = createResource(() => isLoggedIn(), () => meApi.stats());
  const [exportState, setExportState] = createSignal<"idle" | "exporting" | "success" | "error">("idle");

  async function doExport() {
    setExportState("exporting");
    try {
      const result = await exportApi.exportToSheets();
      setExportState("success");
      window.open(result.spreadsheetUrl, "_blank");
      setTimeout(() => setExportState("idle"), 4000);
    } catch (e: any) {
      if (e.message?.startsWith("403")) {
        try {
          const { url } = await exportApi.getAuthorizeUrl();
          window.location.href = url;
        } catch {
          setExportState("error");
          setTimeout(() => setExportState("idle"), 3000);
        }
      } else {
        setExportState("error");
        setTimeout(() => setExportState("idle"), 3000);
      }
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const exportParam = params.get("export");
    if (exportParam === "ready") {
      history.replaceState(null, "", window.location.pathname);
      doExport();
    } else if (exportParam === "denied" || exportParam === "error") {
      history.replaceState(null, "", window.location.pathname);
      setExportState("error");
      setTimeout(() => setExportState("idle"), 3000);
    }

  });

  createEffect(() => {
    const hash = location.hash.slice(1);
    if (!hash) return;
    // Track myStats so we re-run after async content renders
    myStats();
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    });
  });

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
      const updated = await meApi.update({
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
                    disabled={saving() || !isOnline()}
                  >
                    {saving() ? "Sparar..." : "Spara"}
                  </button>
                </div>
              </div>
            </Show>

            <button class={styles.signOutBtn} onClick={signOut} disabled={!isOnline()}>
              {isOnline() ? "Logga ut" : "Logga ut (offline)"}
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

      {/* Export */}
      <div id="export" class={styles.exportSection}>
        <h2 class={styles.sectionTitle}>Exportera</h2>
        <p class={styles.exportDescription}>
          Exportera dina observationer till ett Google Kalkylark. Arket skapas automatiskt på ditt Google-konto och öppnas i en ny flik.
        </p>
        <button
          class={styles.exportBtn}
          classList={{
            [styles.exportBtnSuccess]: exportState() === "success",
            [styles.exportBtnError]: exportState() === "error",
          }}
          onClick={doExport}
          disabled={exportState() === "exporting" || !isOnline()}
        >
          <Icon
            name={
              exportState() === "success" ? "check" :
              exportState() === "error" ? "error_outline" :
              "download"
            }
            size={18}
          />
          {exportState() === "exporting" ? "Exporterar..." :
           exportState() === "success" ? "Exporterad!" :
           exportState() === "error" ? "Fel vid export" :
           "Exportera till Google Kalkylark"}
        </button>
      </div>

    </div>
  );
}
