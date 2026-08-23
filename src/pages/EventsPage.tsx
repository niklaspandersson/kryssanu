import { createSignal, createResource, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import shared from "../styles/shared.module.css";
import styles from "./EventsPage.module.css";

type Tab = "active" | "upcoming" | "past";

export default function EventsPage() {
  const { isLoggedIn } = useAuth();
  const [tab, setTab] = createSignal<Tab>("active");

  const PAGE_SIZE = 20;
  const [page, setPage] = createSignal(0);

  // Each tab is its own server-side query. Filtering client-side over one
  // fetch meant the tabs shared a single truncated result set, so the
  // "Avslutade" tab progressively lost events as they accumulated.
  const [eventPage, { refetch }] = createResource(
    () => (isLoggedIn() ? { status: tab(), offset: page() * PAGE_SIZE } : null),
    (source) =>
      eventsApi.getAll({
        status: source.status,
        limit: PAGE_SIZE,
        offset: source.offset,
      })
  );
  const [invites, { refetch: refetchInvites }] = createResource(
    () => isLoggedIn(),
    () => eventsApi.invites()
  );

  const events = () => eventPage()?.events ?? [];
  const total = () => eventPage()?.total ?? 0;
  const pageCount = () => Math.max(1, Math.ceil(total() / PAGE_SIZE));

  function selectTab(t: Tab) {
    setTab(t);
    setPage(0);
  }

  async function handleRespond(eventId: string, status: "ACCEPTED" | "DECLINED") {
    await eventsApi.respond(eventId, status);
    refetch();
    refetchInvites();
  }

  return (
    <div class={shared.page}>
      <div class={shared.pageHeader}>
        <h1 class={shared.heading}>Event</h1>
        <Show
          when={isOnline()}
          fallback={
            <span class={shared.actionBtnDisabled}>
              <Icon name="cloud_off" size={20} />
              Offline
            </span>
          }
        >
          <A href="/events/new" class={shared.actionBtn}>
            <Icon name="add" size={20} />
            Skapa
          </A>
        </Show>
      </div>

      {/* Pending invites */}
      <Show when={isOnline() && (invites() ?? []).length > 0}>
        <div class={styles.invites}>
          <For each={(invites() ?? [])}>
            {(event) => (
              <div
                class={styles.inviteCard}
                data-testid="invite-card"
                data-event-id={event.id}
              >
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
            onClick={() => selectTab(t)}
            aria-selected={tab() === t}
            data-testid="events-tab"
            data-tab={t}
          >
            {t === "active" ? "Aktiva" : t === "upcoming" ? "Kommande" : "Avslutade"}
          </button>
        ))}
      </div>

      {/* Event list */}
      <Show
        when={events().length > 0}
        fallback={<EmptyState icon="event" message="Inga event här" />}
      >
        <Show when={total() > PAGE_SIZE}>
          <div class={styles.resultCount}>
            Visar {page() * PAGE_SIZE + 1}–{page() * PAGE_SIZE + events().length} av {total()}
          </div>
        </Show>
        <div class={shared.itemList}>
          <For each={events()}>
            {(event) => (
              <A
                href={`/events/${event.id}`}
                class={shared.card}
                data-testid="event-card"
                data-event-id={event.id}
              >
                <div class={shared.cardInfo}>
                  <span class={`${shared.cardTitle} ${styles.eventName}`}>
                    {event.name}
                    <Show when={event.isPublic}>
                      <span class={styles.publicTag}>Publikt</span>
                    </Show>
                  </span>
                  <span class={shared.cardMeta}>
                    {new Date(event.startsAt).toLocaleDateString("sv-SE")}
                    {" - "}
                    {new Date(event.endsAt).toLocaleDateString("sv-SE")}
                  </span>
                  <span class={shared.cardMeta}>
                    {event.participantCount} deltagare · {event.observationCount} observationer
                  </span>
                </div>
                <Icon name="chevron_right" />
              </A>
            )}
          </For>
        </div>
        <Show when={pageCount() > 1}>
          <div class={styles.pagination}>
            <button
              class={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page() === 0 || eventPage.loading}
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span class={styles.pageInfo}>
              Sida {page() + 1} av {pageCount()}
            </span>
            <button
              class={styles.pageBtn}
              onClick={() => setPage((p) => p + 1)}
              disabled={page() >= pageCount() - 1 || eventPage.loading}
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}
