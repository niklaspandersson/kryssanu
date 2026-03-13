import { createResource, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { feed, stats as statsApi, events as eventsApi, observations } from "../lib/api";
import { useAuth } from "../lib/auth";
import { openSearch } from "../components/AppShell";
import StatCard from "../components/StatCard";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const { user, isLoggedIn, requestLogin } = useAuth();

  const [myStats] = createResource(() => isLoggedIn(), (loggedIn) => loggedIn ? statsApi.me() : undefined);
  const [feedData] = createResource(() => isLoggedIn(), (loggedIn) => loggedIn ? feed.get() : undefined);
  const [activeEvents] = createResource(() => isLoggedIn(), (loggedIn) => loggedIn ? eventsApi.getAll("active") : undefined);
  const [latestObs] = createResource(() => isLoggedIn(), (loggedIn) => loggedIn ? observations.latest() : undefined);

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
      {/* Hero */}
      <section class={styles.hero}>
        <div class={styles.heroContent}>
          <span class={`md-icon ${styles.heroIcon}`}>park</span>
          <h1 class={styles.heroTitle}>Kryssa.nu</h1>
          <p class={styles.heroSubtitle}>
            Din personliga fågeljournal — kryssa arter, tävla med vänner och följ din statistik.
          </p>
          <button class={styles.heroCta} onClick={() => openSearch()}>
            <span class="md-icon">search</span>
            Sök fåglar
          </button>
        </div>
      </section>

      {/* Logged-in dashboard */}
      <Show when={isLoggedIn()}>
        <div class={styles.greeting}>
          <h2 class={styles.greetingText}>
            Hej, {user()?.name?.split(" ")[0] ?? "du"}!
          </h2>
          <p class={styles.greetingSubtitle}>
            Här är din sammanfattning
          </p>
        </div>

        {/* Active events */}
        <Show when={(activeEvents() ?? []).length > 0}>
          <section class={styles.section}>
            <h2 class={styles.sectionTitle}>
              <Icon name="event" size={20} />
              Aktiva event
              <A href="/events" class={styles.sectionLink}>Visa alla</A>
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

        {/* Latest observations */}
        <Show when={(latestObs() ?? []).length > 0}>
          <section class={styles.section}>
            <h2 class={styles.sectionTitle}>
              <Icon name="visibility" size={20} />
              Senaste observationer
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

        {/* Recent activity */}
        <Show when={(feedData()?.items ?? []).length > 0}>
          <section class={styles.section}>
            <h2 class={styles.sectionTitle}>
              <Icon name="history" size={20} />
              Senaste aktivitet
              <A href="/feed" class={styles.sectionLink}>Visa alla</A>
            </h2>
            <For each={feedData()!.items.slice(0, 5)}>
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
          </section>
        </Show>
      </Show>

      {/* Visitor view */}
      <Show when={!isLoggedIn()}>
        <div class={styles.features}>
          <div class={styles.featureCard}>
            <div class={styles.featureIconWrapper}>
              <span class="md-icon">checklist</span>
            </div>
            <div class={styles.featureText}>
              <span class={styles.featureTitle}>Kryssa fåglar</span>
              <span class={styles.featureDesc}>
                Håll koll på vilka arter du sett. Sök bland alla svenska fåglar och logga dina observationer.
              </span>
            </div>
          </div>
          <div class={styles.featureCard}>
            <div class={styles.featureIconWrapper}>
              <span class="md-icon">emoji_events</span>
            </div>
            <div class={styles.featureText}>
              <span class={styles.featureTitle}>Tävla med vänner</span>
              <span class={styles.featureDesc}>
                Skapa event och bjud in vänner. Se vem som kryssar flest arter under en helg eller semester.
              </span>
            </div>
          </div>
          <div class={styles.featureCard}>
            <div class={styles.featureIconWrapper}>
              <span class="md-icon">bar_chart</span>
            </div>
            <div class={styles.featureText}>
              <span class={styles.featureTitle}>Följ din statistik</span>
              <span class={styles.featureDesc}>
                Se hur många arter du kryssat totalt, i år och denna vecka. Jämför dig med andra.
              </span>
            </div>
          </div>
        </div>

        <button class={styles.loginCta} onClick={() => requestLogin()}>
          <span class="md-icon">login</span>
          Logga in med Google
        </button>
      </Show>
    </div>
  );
}
