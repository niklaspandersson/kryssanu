import { createSignal, createResource, Show, For, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import styles from "./EventsPage.module.css";

type Tab = "active" | "upcoming" | "past";

export default function EventsPage() {
  const { isLoggedIn, requestLogin, user } = useAuth();
  const [tab, setTab] = createSignal<Tab>("active");

  onMount(() => {
    if (!isLoggedIn()) requestLogin();
  });

  const [allEvents, { refetch }] = createResource(
    () => isLoggedIn(),
    () => eventsApi.getAll()
  );

  const filtered = () => {
    const list = allEvents() ?? [];
    const now = Date.now();
    return list.filter((e) => {
      const start = new Date(e.startsAt).getTime();
      const end = new Date(e.endsAt).getTime();
      if (tab() === "active") return start <= now && end >= now;
      if (tab() === "upcoming") return start > now;
      return end < now;
    });
  };

  const pendingInvites = () => {
    const list = allEvents() ?? [];
    const userId = user()?.id;
    if (!userId) return [];
    return list.filter((e) =>
      e.participants.some((p) => p.user.id === userId && p.status === "INVITED")
    );
  };

  async function handleRespond(eventId: string, status: "ACCEPTED" | "DECLINED") {
    await eventsApi.respond(eventId, status);
    refetch();
  }

  return (
    <div class={styles.page}>
      <div class={styles.header}>
        <h1 class={styles.heading}>Event</h1>
        <A href="/events/new" class={styles.createBtn}>
          <Icon name="add" size={20} />
          Skapa
        </A>
      </div>

      {/* Pending invites */}
      <Show when={pendingInvites().length > 0}>
        <div class={styles.invites}>
          <For each={pendingInvites()}>
            {(event) => (
              <div class={styles.inviteCard}>
                <div class={styles.inviteInfo}>
                  <span class={styles.inviteLabel}>Inbjudan</span>
                  <span class={styles.inviteName}>{event.name}</span>
                </div>
                <div class={styles.inviteActions}>
                  <button
                    class={styles.acceptBtn}
                    onClick={() => handleRespond(event.id, "ACCEPTED")}
                  >
                    Acceptera
                  </button>
                  <button
                    class={styles.declineBtn}
                    onClick={() => handleRespond(event.id, "DECLINED")}
                  >
                    Avboj
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Tabs */}
      <div class={styles.tabs}>
        {(["active", "upcoming", "past"] as Tab[]).map((t) => (
          <button
            class={styles.tab}
            classList={{ [styles.tabActive]: tab() === t }}
            onClick={() => setTab(t)}
          >
            {t === "active" ? "Aktiva" : t === "upcoming" ? "Kommande" : "Avslutade"}
          </button>
        ))}
      </div>

      {/* Event list */}
      <Show
        when={filtered().length > 0}
        fallback={<EmptyState icon="event" message="Inga event har" />}
      >
        <div class={styles.list}>
          <For each={filtered()}>
            {(event) => (
              <A href={`/events/${event.id}`} class={styles.eventCard}>
                <div class={styles.eventInfo}>
                  <span class={styles.eventName}>{event.name}</span>
                  <span class={styles.eventMeta}>
                    {new Date(event.startsAt).toLocaleDateString("sv-SE")}
                    {" - "}
                    {new Date(event.endsAt).toLocaleDateString("sv-SE")}
                  </span>
                  <span class={styles.eventMeta}>
                    {event.participants.length} deltagare · {event.observationCount} obs
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
