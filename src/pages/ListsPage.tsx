import { createResource, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { lists as listsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import styles from "./ListsPage.module.css";

export default function ListsPage() {
  const { isLoggedIn } = useAuth();
  const [allLists] = createResource(
    () => isLoggedIn(),
    () => listsApi.getAll()
  );

  return (
    <div class={styles.page}>
      <div class={styles.header}>
        <h1 class={styles.heading}>Listor</h1>
        <Show
          when={isOnline()}
          fallback={
            <span class={styles.createBtnDisabled}>
              <Icon name="cloud_off" size={20} />
              Offline
            </span>
          }
        >
          <A href="/lists/new" class={styles.createBtn}>
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
            message="Du har inga listor än. Skapa en för att gruppera observationer, t.ex. 'Hemma' eller 'Till jobbet'."
          />
        }
      >
        <div class={styles.list}>
          <For each={allLists()}>
            {(list) => (
              <A href={`/lists/${list.id}`} class={styles.listCard}>
                <div class={styles.listInfo}>
                  <span class={styles.listName}>{list.name}</span>
                  <Show when={list.description}>
                    {(desc) => <span class={styles.listDesc}>{desc()}</span>}
                  </Show>
                  <span class={styles.listMeta}>
                    {list.observationCount} observationer
                  </span>
                </div>
                <Icon name="chevron_right" />
              </A>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
