import { createResource, createSignal, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { lists as listsApi } from "../lib/api";
import { refreshLists } from "../lib/listStore";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import shared from "../styles/shared.module.css";
import styles from "./ListsPage.module.css";

type ConfirmConfig = {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export default function ListsPage() {
  const { isLoggedIn } = useAuth();
  const [allLists, { refetch }] = createResource(
    () => isLoggedIn(),
    () => listsApi.getAll()
  );

  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editName, setEditName] = createSignal("");
  const [editDescription, setEditDescription] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  const [confirm, setConfirm] = createSignal<ConfirmConfig | null>(null);
  const [working, setWorking] = createSignal(false);

  function startEdit(list: { id: string; name: string; description: string | null }) {
    setEditName(list.name);
    setEditDescription(list.description ?? "");
    setEditingId(list.id);
  }

  async function saveEdit(e: Event) {
    e.preventDefault();
    const id = editingId();
    if (!id || !editName()) return;
    setSaving(true);
    try {
      await listsApi.update(id, {
        name: editName(),
        description: editDescription() || null,
      });
      setEditingId(null);
      refetch();
      refreshLists();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(list: { id: string; name: string }) {
    setConfirm({
      title: "Ta bort lista?",
      text: `Är du säker på att du vill ta bort "${list.name}"? Observationerna behålls.`,
      confirmLabel: "Ta bort",
      onConfirm: async () => {
        setWorking(true);
        try {
          await listsApi.remove(list.id);
          setConfirm(null);
          refetch();
          refreshLists();
        } finally {
          setWorking(false);
        }
      },
    });
  }

  return (
    <div class={shared.page}>
      <div class={shared.pageHeader}>
        <h1 class={shared.heading}>Listor</h1>
        <Show
          when={isOnline()}
          fallback={
            <span class={shared.actionBtnDisabled}>
              <Icon name="cloud_off" size={20} />
              Offline
            </span>
          }
        >
          <A href="/lists/new" class={shared.actionBtn}>
            <Icon name="add" size={20} />
            Skapa
          </A>
        </Show>
      </div>

      <Show
        when={(allLists() ?? []).length > 0}
        fallback={
          <EmptyState
            icon="format_list_bulleted"
            message="Du har inga listor än. Skapa en för att gruppera observationer, t.ex. 'Hemma' eller 'På väg till jobbet'."
          />
        }
      >
        <div class={shared.itemList}>
          <For each={allLists()}>
            {(list) => (
              <Show
                when={editingId() === list.id}
                fallback={
                  <div class={styles.listCard}>
                    <A
                      href={`/observations/list/${list.id}`}
                      class={styles.cardLink}
                    >
                      <span class={shared.cardTitle}>{list.name}</span>
                      <Show when={list.description}>
                        {(desc) => <span class={styles.listDesc}>{desc()}</span>}
                      </Show>
                      <span class={shared.cardMeta}>
                        {list.observationCount} kryss
                      </span>
                    </A>
                    <Show when={isOnline()}>
                      <div class={styles.cardActions}>
                        <button
                          class={styles.iconBtn}
                          onClick={() => startEdit(list)}
                          title="Redigera lista"
                        >
                          <Icon name="edit" size={20} />
                        </button>
                        <button
                          class={styles.iconBtn}
                          onClick={() => handleDelete(list)}
                          title="Ta bort lista"
                        >
                          <Icon name="delete" size={20} />
                        </button>
                      </div>
                    </Show>
                  </div>
                }
              >
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
                      onClick={() => setEditingId(null)}
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              </Show>
            )}
          </For>
        </div>
      </Show>

      <ConfirmDialog
        open={!!confirm()}
        title={confirm()?.title ?? ""}
        text={confirm()?.text ?? ""}
        confirmLabel={confirm()?.confirmLabel ?? ""}
        busy={working()}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm()?.onConfirm()}
      />
    </div>
  );
}
