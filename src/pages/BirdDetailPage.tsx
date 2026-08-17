import { createResource, createMemo, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { me as meApi, birdImages as birdImagesApi } from "../lib/api";
import { allBirds } from "../lib/birdStore";
import { userLists } from "../lib/listStore";
import { useAuth } from "../lib/auth";
import { pendingObservations } from "../lib/offlineSync";
import { observationsRevision } from "../lib/observationStore";
import type { Observation } from "../lib/types";
import { isRarity } from "../lib/birds";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import shared from "../styles/shared.module.css";
import styles from "./BirdDetailPage.module.css";

type ObsRow = Observation & { listIds?: string[]; pending?: boolean };

export default function BirdDetailPage() {
  const params = useParams();
  const { isLoggedIn, user } = useAuth();

  // Solid Router does not URL-decode route params, and bird IDs are latin
  // species names containing spaces — decode before matching/fetching.
  const birdId = () => decodeURIComponent(params.id);
  const bird = createMemo(() => allBirds().find(b => b.id === birdId()));
  const [obs] = createResource(
    () => (isLoggedIn() ? { id: birdId(), rev: observationsRevision() } : null),
    (source) => meApi.observationsForBird(source.id)
  );

  // Observations queued while offline aren't on the server yet, so `obs` (a
  // server fetch) can't include them. Show this bird's pending kryss at the top.
  const rows = createMemo<ObsRow[]>(() => {
    const id = birdId();
    const pending: ObsRow[] = pendingObservations()
      .filter((p) => p.birdId === id)
      .map((p) => ({
        id: `pending-${p.id}`,
        date: p.createdAt,
        location: p.location ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        note: p.note ?? null,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
        birdId: p.birdId,
        userId: user()?.id ?? "",
        pending: true,
      }));
    return [...pending, ...(obs() ?? [])];
  });

  // Public first image for this bird, shown to everyone (incl. logged-out users).
  const [heroImage] = createResource(
    birdId,
    (id) => birdImagesApi.first(id)
  );

  const listById = createMemo(() =>
    Object.fromEntries(userLists().map((l) => [l.id, l]))
  );
  const listsFor = (o: { listIds?: string[] }) =>
    (o.listIds ?? []).map((id) => listById()[id]).filter(Boolean);

  return (
    <div class={shared.page}>
      <Show when={bird()} fallback={<EmptyState icon="checklist" message="Laddar..." />}>
        {(b) => (
          <>
            <h1 class={shared.heading}>
              {b().swedish}
              <Show when={isRarity(b()!)}>
                <span class={styles.visitorBadge}>Raritet</span>
              </Show>
            </h1>
            <p class={styles.latin}>{b().id}</p>
            <div class={styles.family}>{b().family}</div>

            <Show when={heroImage()}>
              {(img) => (
                <figure class={styles.heroImage}>
                  <img
                    src={img().url}
                    alt={b().swedish}
                    width={img().width ?? undefined}
                    height={img().height ?? undefined}
                    loading="lazy"
                  />
                  <figcaption class={styles.credit}>
                    {[img().uploaderName ?? "Okänd", img().year, img().location]
                      .filter(Boolean)
                      .join(" · ")}
                  </figcaption>
                </figure>
              )}
            </Show>

            <Show when={isLoggedIn()}>
              <section class={styles.section}>
                <h2 class={shared.sectionTitle}>
                  <Icon name="visibility" size={20} />
                  Mina observationer
                  <Show when={rows().length > 0}>
                    <span class={styles.count}>({rows().length})</span>
                    <A
                      href={`/observations/bird/${encodeURIComponent(birdId())}`}
                      class={styles.sectionLink}
                    >
                      Visa alla
                    </A>
                  </Show>
                </h2>
                <Show
                  when={rows().length > 0}
                  fallback={
                    <EmptyState
                      icon="visibility_off"
                      message="Du har inte observerat denna fågel ännu"
                    />
                  }
                >
                  <ul class={styles.obsList}>
                    <For each={rows().slice(0, 10)}>
                      {(o) => (
                        <li class={styles.obsItem}>
                          <div class={styles.obsRow}>
                            <span class={styles.obsContent}>
                              <span class={styles.obsBird}>{b().swedish}</span>
                              <Show when={o.location}>
                                {(loc) => (
                                  <span class={styles.obsLocation}> · {loc()}</span>
                                )}
                              </Show>
                              <Show when={listsFor(o).length > 0}>
                                <span class={styles.obsListTags}>
                                  <For each={listsFor(o)}>
                                    {(l) => (
                                      <span class={styles.listTagDot}>{l!.name}</span>
                                    )}
                                  </For>
                                </span>
                              </Show>
                              <Show when={o.image}>
                                <Icon name="image" size={16} class={styles.obsImageIcon} />
                              </Show>
                              <Show when={o.pending}>
                                <span class={styles.pendingBadge}>
                                  <Icon name="cloud_off" size={14} />
                                  Väntar på synk
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
