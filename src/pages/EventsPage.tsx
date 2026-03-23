import { createSignal, createResource, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { events as eventsApi, me as meApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import styles from "./EventsPage.module.css";

type Tab = "active" | "upcoming" | "past";

export default function EventsPage() {
  const { isLoggedIn } = useAuth();
  const [tab, setTab] = createSignal<Tab>("active");

  const [allEvents, { refetch }] = createResource(
    () => isLoggedIn(),
    () => eventsApi.getAll()
  );
  const [memberships] = createResource(
    () => isLoggedIn(),
    () => meApi.memberships()
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
    const m = memberships() ?? {};
    return list.filter((e) => m[e.id] === "INVITED");
  };

  async function handleRespond(eventId: string, status: "ACCEPTED" | "DECLINED") {
    await eventsApi.respond(eventId, status);
    refetch();
  }

  return (
    <div class={styles.page}>
      <div class={styles.header}>
        <h1 class={styles.heading}>Event</h1>
        <Show
          when={isOnline()}
          fallback={
            <span class={styles.createBtnDisabled}>
              <Icon name="cloud_off" size={20} />
              Offline
            </span>
          }
        >
          <A href="/events/new" class={styles.createBtn}>
            <Icon name="add" size={20} />
            Skapa
          </A>
        </Show>
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
                    disabled={!isOnline()}
                  >
                    Acceptera
                  </button>
                  <button
                    class={styles.declineBtn}
                    onClick={() => handleRespond(event.id, "DECLINED")}
                    disabled={!isOnline()}
                  >
                    Avböj
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
        fallback={<EmptyState icon="event" message="Inga event här" />}
      >
        <div class={styles.list}>
          <For each={filtered()}>
            {(event) => (
              <A href={`/events/${event.id}`} class={styles.eventCard}>
                <div class={styles.eventInfo}>
                  <span class={styles.eventName}>
                    {event.name}
                    <Show when={event.isPublic}>
                      <span class={styles.publicTag}>Publikt</span>
                    </Show>
                  </span>
                  <span class={styles.eventMeta}>
                    {new Date(event.startsAt).toLocaleDateString("sv-SE")}
                    {" - "}
                    {new Date(event.endsAt).toLocaleDateString("sv-SE")}
                  </span>
                  <span class={styles.eventMeta}>
                    {event.participantCount} deltagare · {event.observationCount} obs
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
