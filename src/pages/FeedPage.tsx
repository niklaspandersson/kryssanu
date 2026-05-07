import { createResource, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { feed, me as meApi, events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import StatCard from "../components/StatCard";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import shared from "../styles/shared.module.css";
import styles from "./FeedPage.module.css";

export default function FeedPage() {
  const { user, isLoggedIn } = useAuth();

  const [myStats] = createResource(() => isLoggedIn(), () => meApi.stats());
  const [feedData] = createResource(() => isLoggedIn(), () => feed.get());
  const [activeEvents] = createResource(() => isLoggedIn(), () => eventsApi.getAll("active"));
  const [latestObs] = createResource(() => isLoggedIn(), () => meApi.observations());

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
                      <span class={shared.activityBird}>{item.bird.swedish}</span>
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
      <Show when={(latestObs() ?? []).length > 0}>
        <section class={shared.section}>
          <h2 class={shared.sectionTitle}>
            <Icon name="visibility" size={20} />
            Dina senaste observationer
            <A href="/my-birds" class={styles.sectionLink}>Visa alla</A>
          </h2>
          <For each={latestObs()!.slice(0, 5)}>
            {(obs) => (
              <div class={shared.activityItem}>
                <div class={shared.activityContent}>
                  <span>
                    <span class={shared.activityBird}>{obs.bird.swedish}</span>
                    {obs.location && <span class={styles.feedLocation}> · {obs.location}</span>}
                  </span>
                  <span class={shared.activityDate}>
                    {new Date(obs.date).toLocaleDateString("sv-SE")}
                  </span>
                </div>
              </div>
            )}
          </For>
        </section>
      </Show>
    </div>
  );
}
