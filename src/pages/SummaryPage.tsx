import { createResource, createMemo, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { feed, me as meApi, events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import { allBirds } from "../lib/birdStore";
import { pendingObservations } from "../lib/offlineSync";
import { observationsRevision } from "../lib/observationStore";
import type { ObservationWithBird } from "../lib/types";
import StatCard from "../components/StatCard";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import shared from "../styles/shared.module.css";
import styles from "./SummaryPage.module.css";

export default function SummaryPage() {
  const { user, isLoggedIn } = useAuth();

  const [myStats] = createResource(() => isLoggedIn(), () => meApi.stats());
  const [feedData] = createResource(
    () => (isLoggedIn() ? observationsRevision() : undefined),
    () => feed.get()
  );
  const [activeEvents] = createResource(() => isLoggedIn(), () => eventsApi.getAll("active"));
  const [latestObs] = createResource(
    () => (isLoggedIn() ? observationsRevision() : undefined),
    () => meApi.observations()
  );

  // Observations queued while offline haven't reached the server yet, so
  // `latestObs` (a server fetch) can't include them. Map them to the display
  // shape and show them at the top with a "pending sync" marker.
  const pendingRows = createMemo<(ObservationWithBird & { pending: true })[]>(() => {
    const birds = allBirds();
    return pendingObservations().map((p) => {
      const bird = birds.find((b) => b.id === p.birdId);
      return {
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
        bird: bird ?? {
          id: p.birdId,
          swedish: p.birdName,
          english: null,
          family: "",
          familyLatin: null,
          orderLatin: null,
          orderSwedish: null,
          parentId: null,
          kategori: null,
          status: null,
          extinct: false,
          delisted: false,
        },
        pending: true as const,
      };
    });
  });

  const latestRows = createMemo(() => [
    ...pendingRows(),
    ...(latestObs() ?? []),
  ]);

  function remaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d kvar`;
    if (hours > 0) return `${hours}h kvar`;
    return "Slutar snart";
  }

  return (
    <div class={shared.page}>
      <div class={styles.greeting}>
        <h2 class={styles.greetingText}>
          Hej, {user()?.name?.split(" ")[0] ?? "du"}!
        </h2>
        <p class={styles.greetingSubtitle}>
          Här är din sammanfattning
        </p>
      </div>

      {/* Quick stats */}
      <Show when={myStats()}>
        {(s) => (
          <div class={styles.statsRow}>
            <StatCard value={s().uniqueSpeciesLifetime} label="Arter totalt" />
            <StatCard value={s().uniqueSpeciesThisYear} label="Arter i år" />
            <StatCard value={s().observationsThisWeek} label="Denna vecka" />
          </div>
        )}
      </Show>

      {/* Active events */}
      <Show
        when={isOnline()}
        fallback={
          <section class={shared.section}>
            <h2 class={shared.sectionTitle}>
              <Icon name="event" size={20} />
              Aktiva event
            </h2>
            <div class={shared.offlineBox}>
              <Icon name="cloud_off" size={24} />
              <p class={shared.offlineText}>Eventinformation är inte tillgänglig offline.</p>
            </div>
          </section>
        }
      >
        <Show when={(activeEvents() ?? []).length > 0}>
          <section class={shared.section}>
            <h2 class={shared.sectionTitle}>
              <Icon name="event" size={20} />
              Aktiva event
            </h2>
            <For each={activeEvents()}>
              {(event) => (
                <A href={`/events/${event.id}`} class={styles.eventCard}>
                  <div class={styles.eventInfo}>
                    <span class={styles.eventName}>{event.name}</span>
                    <span class={styles.eventMeta}>
                      {event.participantCount} deltagare · {remaining(event.endsAt)}
                    </span>
                  </div>
                  <Icon name="chevron_right" />
                </A>
              )}
            </For>
          </section>
        </Show>
      </Show>

      {/* Recent activity */}
      <section class={shared.section}>
        <h2 class={shared.sectionTitle}>
          <Icon name="history" size={20} />
          Senaste aktivitet
        </h2>
        <Show
          when={isOnline()}
          fallback={
            <div class={shared.offlineBox}>
              <Icon name="cloud_off" size={24} />
              <p class={shared.offlineText}>Senaste aktivitet är inte tillgänglig offline.</p>
            </div>
          }
        >
          <Show
            when={(feedData()?.items ?? []).length > 0}
            fallback={
              <EmptyState
                icon="group"
                message="Inga observationer från andra ännu. Ga med i ett event!"
              />
            }
          >
            <For each={feedData()!.items.slice(0, 15)}>
              {(item) => (
                <div class={shared.activityItem}>
                  <Avatar
                    name={item.user.name}
                    image={item.user.image}
                    size={32}
                  />
                  <div class={shared.activityContent}>
                    <span>
                      <span class={shared.activityUser}>{item.user.name}</span>
                      {" "}kryssade{" "}
                      <A
                        href={`/birds/${encodeURIComponent(item.bird.id)}`}
                        class={`${shared.activityBird} ${styles.birdLink}`}
                      >
                        {item.bird.swedish}
                      </A>
                    </span>
                    <span class={shared.activityDate}>
                      {new Date(item.date).toLocaleDateString("sv-SE")}
                    </span>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </section>

      {/* Latest observations */}
      <Show when={latestRows().length > 0}>
        <section class={shared.section}>
          <h2 class={shared.sectionTitle}>
            <Icon name="visibility" size={20} />
            Dina senaste kryss
            <A href="/observations" class={styles.sectionLink}>Visa alla</A>
          </h2>
          <ul class={styles.obsList}>
            <For each={latestRows().slice(0, 5)}>
              {(obs) => (
                <li class={styles.obsItem}>
                  <div class={styles.obsRow}>
                    <span class={styles.obsContent}>
                      <A
                        href={`/birds/${encodeURIComponent(obs.bird.id)}`}
                        class={styles.obsBird}
                      >
                        {obs.bird.swedish}
                      </A>
                      <Show when={obs.location}>
                        {(loc) => <span class={styles.obsLocation}> · {loc()}</span>}
                      </Show>
                      <Show when={"pending" in obs && obs.pending}>
                        <span class={styles.pendingBadge}>
                          <Icon name="cloud_off" size={14} />
                          Väntar på synk
                        </span>
                      </Show>
                    </span>
                    <span class={styles.obsDate}>
                      {new Date(obs.date).toLocaleDateString("sv-SE")}
                    </span>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
    </div>
  );
}
