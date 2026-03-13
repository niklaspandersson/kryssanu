import { createResource, Show, For, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { feed, stats as statsApi, events as eventsApi, observations } from "../lib/api";
import { useAuth } from "../lib/auth";
import StatCard from "../components/StatCard";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import styles from "./FeedPage.module.css";

export default function FeedPage() {
  const { user, isLoggedIn, requestLogin } = useAuth();

  onMount(() => {
    if (!isLoggedIn()) requestLogin();
  });

  const [myStats] = createResource(() => isLoggedIn(), () => statsApi.me());
  const [feedData] = createResource(() => isLoggedIn(), () => feed.get());
  const [activeEvents] = createResource(() => isLoggedIn(), () => eventsApi.getAll("active"));
  const [latestObs] = createResource(() => isLoggedIn(), () => observations.latest());

  function remaining(endsAt: string) {
    const diff = new Date(endsAt).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d kvar`;
    if (hours > 0) return `${hours}h kvar`;
    return "Slutar snart";
  }

  return (
    <div class={styles.page}>
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
      <Show when={(activeEvents() ?? []).length > 0}>
        <section class={styles.section}>
          <h2 class={styles.sectionTitle}>
            <Icon name="event" size={20} />
            Aktiva event
          </h2>
          <For each={activeEvents()}>
            {(event) => (
              <A href={`/events/${event.id}`} class={styles.eventCard}>
                <div class={styles.eventInfo}>
                  <span class={styles.eventName}>{event.name}</span>
                  <span class={styles.eventMeta}>
                    {event.participants.length} deltagare · {remaining(event.endsAt)}
                  </span>
                </div>
                <Icon name="chevron_right" />
              </A>
            )}
          </For>
        </section>
      </Show>

      {/* Recent activity */}
      <section class={styles.section}>
        <h2 class={styles.sectionTitle}>
          <Icon name="history" size={20} />
          Senaste aktivitet
        </h2>
        <Show
          when={(feedData()?.items ?? []).length > 0}
          fallback={
            <EmptyState
              icon="group"
              message="Inga observationer från andra ännu. Ga med i ett event!"
            />
          }
        >
          <For each={feedData()!.items}>
            {(item) => (
              <div class={styles.feedItem}>
                <Avatar
                  name={item.user.name}
                  image={item.user.image}
                  size={32}
                />
                <div class={styles.feedContent}>
                  <span class={styles.feedUser}>{item.user.name}</span>
                  <span class={styles.feedText}>
                    kryssade{" "}
                    <span class={styles.feedBird}>
                      {item.bird.swedish}
                    </span>
                  </span>
                  <span class={styles.feedDate}>
                    {new Date(item.date).toLocaleDateString("sv-SE")}
                  </span>
                </div>
              </div>
            )}
          </For>
        </Show>
      </section>      

      {/* Latest observations */}
      <Show when={(latestObs() ?? []).length > 0}>
        <section class={styles.section}>
          <h2 class={styles.sectionTitle}>
            <Icon name="visibility" size={20} />
            Dina senaste observationer
            <A href="/my-birds" class={styles.sectionLink}>Visa alla</A>
          </h2>
          <For each={latestObs()!.slice(0, 5)}>
            {(obs) => (
              <div class={styles.obsItem}>
                <div class={styles.obsInfo}>
                  <span class={styles.obsName}>{obs.bird.swedish}</span>
                  <span class={styles.obsMeta}>
                    {new Date(obs.date).toLocaleDateString("sv-SE")}
                    {obs.location && ` · ${obs.location}`}
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
