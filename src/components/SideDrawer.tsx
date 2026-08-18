import { Show, For, createResource, createSignal, createEffect, createMemo, onCleanup } from "solid-js";
import { A } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import type { EventWithDetails } from "../lib/types";
import { userLists } from "../lib/listStore";
import styles from "./SideDrawer.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

function categorizeEvents(list: EventWithDetails[]) {
  const now = Date.now();
  const ongoing: EventWithDetails[] = [];
  const upcoming: EventWithDetails[] = [];
  const past: EventWithDetails[] = [];

  for (const e of list) {
    const start = new Date(e.startsAt).getTime();
    const end = new Date(e.endsAt).getTime();
    if (start <= now && end >= now) ongoing.push(e);
    else if (start > now) upcoming.push(e);
    else past.push(e);
  }

  // Prioritize: ongoing first, then upcoming, then past — max 5 total
  const result: { event: EventWithDetails; status: "ongoing" | "upcoming" | "past" }[] = [];
  for (const e of ongoing) {
    if (result.length >= 5) break;
    result.push({ event: e, status: "ongoing" });
  }
  for (const e of upcoming) {
    if (result.length >= 5) break;
    result.push({ event: e, status: "upcoming" });
  }
  for (const e of past) {
    if (result.length >= 5) break;
    result.push({ event: e, status: "past" });
  }
  return result;
}

export default function SideDrawer(props: Props) {
  const { isLoggedIn } = useAuth();

  // The drawer is mounted by AppShell on every authenticated page, so keying
  // this on isLoggedIn() alone fired a request on every page load for a panel
  // that is on mobile usually closed. Fetch once it is actually on screen;
  // createResource caches, so reopening does not refetch. The limit covers what
  // categorizeEvents can show (5) with room for the mix it sorts through.
  const [hasOpened, setHasOpened] = createSignal(false);
  createEffect(() => {
    if (props.open) setHasOpened(true);
  });

  // From 750px up the sidebar is on screen permanently (see the media queries
  // in SideDrawer.module.css) and props.open is never set — above 1000px there
  // is not even a control to set it. "Has been opened" is therefore a
  // mobile-only signal, and gating the fetch on it alone left the desktop
  // sidebar showing "Inga event" forever, having issued no request at all.
  const railQuery = window.matchMedia('(min-width: 750px)');
  const [alwaysVisible, setAlwaysVisible] = createSignal(railQuery.matches);
  const onRailChange = (e: MediaQueryListEvent) => setAlwaysVisible(e.matches);
  railQuery.addEventListener('change', onRailChange);
  onCleanup(() => railQuery.removeEventListener('change', onRailChange));

  const isVisible = () => alwaysVisible() || hasOpened();

  // The source has to keep changing, not latch. Gating only on "has been
  // opened" made it flip to a constant once and never move again, so a first
  // open while offline left the resource stuck in an error state for the rest
  // of the session — the drawer said "Inga event" even after reconnecting.
  //
  // Including isOnline() means the fetcher does not run at all while offline
  // (a falsy source is skipped, so nothing can throw), and reconnecting flips
  // the source and fetches.
  const [allEvents, { refetch }] = createResource(
    () => (isLoggedIn() && isVisible() ? isOnline() : false),
    () => eventsApi.getAll({ limit: 20 })
  );

  // A request that fails while online — a server error, say — would still
  // stick, since the source value does not change. Retry on the next open.
  createEffect(() => {
    if (isVisible() && allEvents.error) void refetch();
  });

  const displayEvents = createMemo(() => categorizeEvents(allEvents()?.events ?? []));

  // Sorting a fresh copy on every render was wasteful for a list rendered five
  // items at a time.
  const recentLists = createMemo(() =>
    userLists()
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  return (
    <>
      <Show when={props.open}>
        <div class={styles.overlay} onClick={() => props.onClose()} />
      </Show>

      <aside class={styles.sidebar} classList={{ [styles.open]: props.open }}>
        <div class={styles.header}>
          <button class={styles.closeBtn} onClick={() => props.onClose()} aria-label="Stäng meny">
            <span class="md-icon">close</span>
          </button>
          <A href="/" class={styles.brand}>
            <img src="/logo-v2-solid.webp" alt="" class={styles.brandLogo} />
            <span class={styles.brandText}>kryssa.nu</span>
          </A>
        </div>

        <div class={styles.body}>
          <A href="/summary" class={styles.navLink} activeClass={styles.activeLink} onClick={() => props.onClose()}>
            <span class="md-icon">home</span>
            <span class={styles.navLabel}>Hem</span>
          </A>
          <A href="/birds" class={styles.navLink} activeClass={styles.activeLink} onClick={() => props.onClose()}>
            <span class="md-icon">checklist</span>
            <span class={styles.navLabel}>Fåglar</span>
          </A>
          <A href="/observations" class={styles.navLink} activeClass={styles.activeLink} onClick={() => props.onClose()}>
            <span class="md-icon">visibility</span>
            <span class={styles.navLabel}>Observationer</span>
          </A>

          <div class={styles.divider} />

          {/* Icon-only event link for rail mode */}
          <A href="/events" class={styles.railEventLink} onClick={() => props.onClose()}>
            <span class="md-icon">event</span>
            
          </A>

          {/* Full events section for expanded/desktop mode */}
          <div class={styles.eventsSection}>
            <A href="/events" class={styles.navLink} activeClass={styles.activeLink} onClick={() => props.onClose()}>
              <span class="md-icon">event</span>
              <span class={styles.navLabel}>Events</span>
            </A>
            <Show
              when={displayEvents().length > 0}
              fallback={
                <span class={styles.eventItem} style={{ color: "var(--color-text-muted)", "font-size": "var(--font-size-sm)" }}>
                  Inga event
                </span>
              }
            >
              <For each={displayEvents()}>
                {(item) => (
                  <A href={`/events/${item.event.id}`} class={styles.eventItem} onClick={() => props.onClose()}>
                    <span
                      class={styles.eventDot}
                      classList={{
                        [styles.dotOngoing]: item.status === "ongoing",
                        [styles.dotUpcoming]: item.status === "upcoming",
                        [styles.dotPast]: item.status === "past",
                      }}
                    />
                    <div class={styles.eventInfo}>
                      <span class={styles.eventName}>{item.event.name}</span>
                      <span class={styles.eventDate}>
                        {new Date(item.event.startsAt).toLocaleDateString("sv-SE")}
                        {item.status === "ongoing" ? " · Pågår" : item.status === "upcoming" ? " · Kommande" : ""}
                      </span>
                    </div>
                  </A>
                )}
              </For>
            </Show>
          </div>

          <div class={styles.divider} />

          {/* Icon-only lists link for rail mode */}
          <A href="/lists" class={styles.railEventLink} onClick={() => props.onClose()}>
            <span class="md-icon">format_list_bulleted</span>
          </A>

          {/* Full lists section for expanded/desktop mode */}
          <div class={styles.eventsSection}>
            <A href="/lists" class={styles.navLink} activeClass={styles.activeLink} onClick={() => props.onClose()}>
              <span class="md-icon">format_list_bulleted</span>
              <span class={styles.navLabel}>Listor</span>
            </A>
            <Show
              when={userLists().length > 0}
              fallback={
                <span class={styles.eventItem} style={{ color: "var(--color-text-muted)", "font-size": "var(--font-size-sm)" }}>
                  Inga listor
                </span>
              }
            >
              <For each={recentLists()}>
                {(list) => (
                  <A href={`/observations/list/${list.id}`} class={styles.eventItem} onClick={() => props.onClose()}>
                    <div class={styles.eventInfo}>
                      <span class={styles.eventName}>{list.name}</span>
                      <span class={styles.eventDate}>{list.observationCount} {list.observationCount === 1 ? "kryss" : "kryss"}</span>
                    </div>
                  </A>
                )}
              </For>
            </Show>
          </div>
        </div>
      </aside>
    </>
  );
}
