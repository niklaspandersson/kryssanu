import { createResource, createMemo, Show, For } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { me as meApi } from "../lib/api";
import { allBirds } from "../lib/birdStore";
import { userLists } from "../lib/listStore";
import { useAuth } from "../lib/auth";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import shared from "../styles/shared.module.css";
import styles from "./BirdDetailPage.module.css";

export default function BirdDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // Solid Router does not URL-decode route params, and bird IDs are latin
  // species names containing spaces — decode before matching/fetching.
  const birdId = () => decodeURIComponent(params.id);
  const bird = createMemo(() => allBirds().find(b => b.id === birdId()));
  const [obs] = createResource(
    () => (isLoggedIn() ? birdId() : null),
    (id) => meApi.observationsForBird(id)
  );

  const listById = createMemo(() =>
    Object.fromEntries(userLists().map((l) => [l.id, l]))
  );
  const listsFor = (o: { listIds?: string[] }) =>
    (o.listIds ?? []).map((id) => listById()[id]).filter(Boolean);

  return (
    <div class={shared.page}>
      <button type="button" class={shared.back} onClick={() => navigate(-1)}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </button>

      <Show when={bird()} fallback={<EmptyState icon="checklist" message="Laddar..." />}>
        {(b) => (
          <>
            <h1 class={shared.heading}>
              {b().swedish}
              <Show when={b().visitor}>
                <span class={styles.visitorBadge}>Raritet</span>
              </Show>
            </h1>
            <p class={styles.latin}>{b().id}</p>
            <div class={styles.family}>{b().family}</div>

            <Show when={isLoggedIn()}>
              <section class={styles.section}>
                <h2 class={shared.sectionTitle}>
                  <Icon name="visibility" size={20} />
                  Mina observationer
                  <Show when={(obs() ?? []).length > 0}>
                    <span class={styles.count}>({obs()!.length})</span>
                  </Show>
                </h2>
                <Show
                  when={(obs() ?? []).length > 0}
                  fallback={
                    <EmptyState
                      icon="visibility_off"
                      message="Du har inte observerat denna fågel ännu"
                    />
                  }
                >
                  <ul class={styles.obsList}>
                    <For each={obs()!.slice(0, 10)}>
                      {(o) => (
                        <li class={styles.obsItem}>
                          <div class={styles.obsRow}>
                            <span class={styles.obsContent}>
                              <span class={styles.obsLocation}>
                                <Show when={o.location} fallback="—">
                                  {o.location}
                                </Show>
                              </span>
                              <Show when={listsFor(o).length > 0}>
                                <span class={styles.obsListTags}>
                                  <For each={listsFor(o)}>
                                    {(l) => (
                                      <span class={styles.listTagDot}>{l!.name}</span>
                                    )}
                                  </For>
                                </span>
                              </Show>
                            </span>
                            <span class={styles.obsDate}>
                              {new Date(o.date).toLocaleDateString("sv-SE")}
                            </span>
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </section>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}
