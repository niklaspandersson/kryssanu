import { Show, For, createResource } from "solid-js";
import { A } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
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

  // categorizeEvents shows at most 5, so there is no reason to pull the
  // endpoint's default page of 50 on every authenticated page load.
  const [allEvents] = createResource(
    () => isLoggedIn(),
    () => eventsApi.getAll({ limit: 20 })
  );

  const displayEvents = () => categorizeEvents(allEvents()?.events ?? []);

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
              <For each={userLists().slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)}>
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
