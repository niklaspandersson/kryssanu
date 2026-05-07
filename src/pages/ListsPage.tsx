import { createResource, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { lists as listsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import shared from "../styles/shared.module.css";
import styles from "./ListsPage.module.css";

export default function ListsPage() {
  const { isLoggedIn } = useAuth();
  const [allLists] = createResource(
    () => isLoggedIn(),
    () => listsApi.getAll()
  );

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
            message="Du har inga listor än. Skapa en för att gruppera observationer, t.ex. 'Hemma' eller 'Till jobbet'."
          />
        }
      >
        <div class={shared.itemList}>
          <For each={allLists()}>
            {(list) => (
              <A href={`/lists/${list.id}`} class={shared.card}>
                <div class={shared.cardInfo}>
                  <span class={shared.cardTitle}>{list.name}</span>
                  <Show when={list.description}>
                    {(desc) => <span class={styles.listDesc}>{desc()}</span>}
                  </Show>
                  <span class={shared.cardMeta}>
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
