import { createSignal, createResource, Show, For } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { lists as listsApi } from "../lib/api";
import { refreshLists } from "../lib/listStore";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import shared from "../styles/shared.module.css";
import styles from "./ListDetailPage.module.css";

export default function ListDetailPage() {
  const params = useParams();
  const navigate = useNavigate();

  const [list, { refetch: refetchList }] = createResource(
    () => params.id,
    (id) => listsApi.getOne(id)
  );
  const [observations, { refetch: refetchObs }] = createResource(
    () => params.id,
    (id) => listsApi.observations(id)
  );

  const [editing, setEditing] = createSignal(false);
  const [editName, setEditName] = createSignal("");
  const [editDescription, setEditDescription] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  function startEdit() {
    const l = list();
    if (!l) return;
    setEditName(l.name);
    setEditDescription(l.description ?? "");
    setEditing(true);
  }

  async function saveEdit(e: Event) {
    e.preventDefault();
    if (!editName()) return;
    setSaving(true);
    try {
      await listsApi.update(params.id, {
        name: editName(),
        description: editDescription() || null,
      });
      setEditing(false);
      refetchList();
      refreshLists();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Är du säker på att du vill ta bort listan? Observationerna behålls.")) return;
    await listsApi.remove(params.id);
    refreshLists();
    navigate("/lists");
  }

  async function handleRemoveObservation(obsId: string) {
    if (!confirm("Ta bort observationen från listan?")) return;
    await listsApi.removeObservation(params.id, obsId);
    refetchObs();
    refetchList();
  }

  return (
    <div class={shared.page}>
      <A href="/lists" class={shared.back}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </A>

      <Show
        when={list()}
        fallback={<EmptyState icon="format_list_bulleted" message="Laddar lista..." />}
      >
        {(l) => (
          <>
            <Show
              when={!editing()}
              fallback={
                <form class={styles.editForm} onSubmit={saveEdit}>
                  <input
                    type="text"
                    class={styles.editInput}
                    value={editName()}
                    onInput={(e) => setEditName(e.currentTarget.value)}
                    maxlength={100}
                    required
                  />
                  <textarea
                    class={styles.editTextarea}
                    value={editDescription()}
                    onInput={(e) => setEditDescription(e.currentTarget.value)}
                    rows={2}
                    maxlength={500}
                    placeholder="Beskrivning (valfri)"
                  />
                  <div class={styles.editActions}>
                    <button
                      type="submit"
                      class={styles.saveBtn}
                      disabled={saving() || !editName() || !isOnline()}
                    >
                      {saving() ? "Sparar..." : "Spara"}
                    </button>
                    <button
                      type="button"
                      class={styles.cancelBtn}
                      onClick={() => setEditing(false)}
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              }
            >
              <div class={styles.headerRow}>
                <h1 class={shared.heading}>{l().name}</h1>
                <Show when={isOnline()}>
                  <div class={styles.headerActions}>
                    <button
                      class={styles.iconBtn}
                      onClick={startEdit}
                      title="Redigera lista"
                    >
                      <Icon name="edit" size={20} />
                    </button>
                    <button
                      class={styles.iconBtn}
                      onClick={handleDelete}
                      title="Ta bort lista"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  </div>
                </Show>
              </div>
              <Show when={l().description}>
                <p class={styles.description}>{l().description}</p>
              </Show>
              <div class={styles.meta}>
                {l().observationCount} observationer
              </div>
            </Show>

            <section class={styles.section}>
              <h2 class={styles.sectionTitle}>Observationer</h2>
              <Show
                when={(observations() ?? []).length > 0}
                fallback={
                  <EmptyState
                    icon="visibility_off"
                    message="Inga observationer i den här listan ännu. Välj listan när du registrerar en ny observation."
                  />
                }
              >
                <div class={styles.obsList}>
                  <For each={observations()}>
                    {(obs) => (
                      <div class={styles.obsItem}>
                        <div class={styles.obsMain}>
                          <span class={styles.obsSpecies}>{obs.bird.swedish}</span>
                          <span class={styles.obsMeta}>
                            {new Date(obs.date).toLocaleDateString("sv-SE")}
                            <Show when={obs.location}>
                              {(loc) => <> · {loc()}</>}
                            </Show>
                          </span>
                          <Show when={obs.note}>
                            {(n) => <p class={styles.obsNote}>{n()}</p>}
                          </Show>
                        </div>
                        <Show when={isOnline()}>
                          <button
                            class={styles.removeBtn}
                            onClick={() => handleRemoveObservation(obs.id)}
                            title="Ta bort från lista"
                          >
                            <Icon name="close" size={18} />
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </section>
          </>
        )}
      </Show>
    </div>
  );
}
