import { createResource, createMemo, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { me as meApi } from "../lib/api";
import { allBirds } from "../lib/birdStore";
import { useAuth } from "../lib/auth";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import styles from "./BirdDetailPage.module.css";

export default function BirdDetailPage() {
  const params = useParams();
  const { isLoggedIn } = useAuth();

  const bird = createMemo(() => allBirds().find(b => b.id === params.id));
  const [obs] = createResource(
    () => (isLoggedIn() ? params.id : null),
    (id) => meApi.observationsForBird(id)
  );

  return (
    <div class={styles.page}>
      <A href="/" class={styles.back}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </A>

      <Show when={bird()} fallback={<EmptyState icon="flutter_dash" message="Laddar..." />}>
        {(b) => (
          <>
            <h1 class={styles.name}>{b().swedish}</h1>
            <p class={styles.latin}>{b().id}</p>
            <div class={styles.family}>
              <Icon name="category" size={16} />
              {b().family}
            </div>

            <Show when={isLoggedIn()}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>
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
                  <div class={styles.timeline}>
                    <For each={obs()}>
                      {(o) => (
                        <div class={styles.obsItem}>
                          <div class={styles.obsDate}>
                            {new Date(o.date).toLocaleDateString("sv-SE")}
                          </div>
                          <Show when={o.location}>
                            <div class={styles.obsMeta}>
                              <Icon name="place" size={14} />
                              {o.location}
                            </div>
                          </Show>
                          <Show when={o.note}>
                            <div class={styles.obsMeta}>
                              <Icon name="notes" size={14} />
                              {o.note}
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </section>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}
