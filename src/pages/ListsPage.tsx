import { createResource, createSignal, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { lists as listsApi } from "../lib/api";
import { refreshLists } from "../lib/listStore";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import EditListSheet from "../components/lists/EditListSheet";
import shared from "../styles/shared.module.css";
import styles from "./ListsPage.module.css";

type ListItem = { id: string; name: string; description: string | null };

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

  // null = closed, "new" = creating, otherwise the list being edited.
  const [editing, setEditing] = createSignal<"new" | ListItem | null>(null);
  const [saving, setSaving] = createSignal(false);

  const [confirm, setConfirm] = createSignal<ConfirmConfig | null>(null);
  const [working, setWorking] = createSignal(false);

  async function handleSave(input: { name: string; description: string | null }) {
    const target = editing();
    if (!target) return;
    setSaving(true);
    try {
      if (target === "new") {
        await listsApi.create({
          name: input.name,
          description: input.description ?? undefined,
        });
      } else {
        await listsApi.update(target.id, input);
      }
      setEditing(null);
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
          <button class={shared.actionBtn} onClick={() => setEditing("new")}>
            <Icon name="add" size={20} />
            Skapa
          </button>
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
                      onClick={() => setEditing(list)}
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
            )}
          </For>
        </div>
      </Show>

      <Show when={editing()}>
        {(target) => (
          <EditListSheet
            list={target() === "new" ? undefined : (target() as ListItem)}
            saving={saving()}
            onClose={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
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
