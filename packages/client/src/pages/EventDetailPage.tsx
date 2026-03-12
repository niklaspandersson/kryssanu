import { createSignal, createResource, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { openSearch } from "../components/AppShell";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import styles from "./EventDetailPage.module.css";

export default function EventDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = createSignal("");

  const [event, { refetch }] = createResource(() => params.id, eventsApi.getOne);
  const [leaderboard] = createResource(() => params.id, eventsApi.leaderboard);

  const isCreator = () => event()?.creatorId === user()?.id;

  const isActive = () => {
    const ev = event();
    if (!ev) return false;
    const now = Date.now();
    return new Date(ev.startsAt).getTime() <= now && new Date(ev.endsAt).getTime() >= now;
  };

  const isPast = () => {
    const ev = event();
    if (!ev) return false;
    return new Date(ev.endsAt).getTime() < Date.now();
  };

  const resultsTop10 = () => {
    const lb = leaderboard() ?? [];
    return lb.slice(0, 10);
  };

  const currentUserEntry = () => {
    const lb = leaderboard() ?? [];
    const uid = user()?.id;
    if (!uid) return null;
    const idx = lb.findIndex((e) => e.user.id === uid);
    if (idx === -1 || idx < 10) return null;
    return { rank: idx + 1, entry: lb[idx] };
  };

  async function handleInvite(e: Event) {
    e.preventDefault();
    if (!inviteEmail()) return;
    await eventsApi.invite(params.id, inviteEmail());
    setInviteEmail("");
    refetch();
  }

  return (
    <div class={styles.page}>
      <A href="/events" class={styles.back}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </A>

      <Show when={event()} fallback={<EmptyState icon="event" message="Laddar event..." />}>
        {(ev) => (
          <>
            <h1 class={styles.heading}>{ev().name}</h1>
            <Show when={ev().description}>
              <p class={styles.description}>{ev().description}</p>
            </Show>
            <div class={styles.dates}>
              <Icon name="schedule" size={16} />
              {new Date(ev().startsAt).toLocaleDateString("sv-SE")} -{" "}
              {new Date(ev().endsAt).toLocaleDateString("sv-SE")}
            </div>

            {/* Add observation (active events only) */}
            <Show when={isActive()}>
              <button
                class={styles.addObsBtn}
                onClick={() => openSearch()}
              >
                <Icon name="add" size={20} />
                Lagg till observation
              </button>
            </Show>

            {/* Results (past events) */}
            <Show when={isPast()}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>Resultat</h2>
                <Show
                  when={resultsTop10().length > 0}
                  fallback={<EmptyState icon="emoji_events" message="Inga observationer registrerades" />}
                >
                  <div class={styles.leaderboard}>
                    <For each={resultsTop10()}>
                      {(entry, i) => (
                        <A href={`/stats/${entry.user.id}`} class={styles.lbRow}>
                          <span class={styles.lbRank}>{i() + 1}</span>
                          <Avatar name={entry.user.name} image={entry.user.image} size={32} />
                          <div class={styles.lbInfo}>
                            <span class={styles.lbName}>{entry.user.name}</span>
                            <span class={styles.lbMeta}>
                              {entry.uniqueSpecies} arter · {entry.totalObservations} obs
                            </span>
                          </div>
                        </A>
                      )}
                    </For>
                    {/* Current user if outside top 10 */}
                    <Show when={currentUserEntry()}>
                      {(cu) => (
                        <>
                          <div class={styles.lbDivider}>···</div>
                          <A href={`/stats/${cu().entry.user.id}`} class={`${styles.lbRow} ${styles.lbRowHighlight}`}>
                            <span class={styles.lbRank}>{cu().rank}</span>
                            <Avatar name={cu().entry.user.name} image={cu().entry.user.image} size={32} />
                            <div class={styles.lbInfo}>
                              <span class={styles.lbName}>{cu().entry.user.name}</span>
                              <span class={styles.lbMeta}>
                                {cu().entry.uniqueSpecies} arter · {cu().entry.totalObservations} obs
                              </span>
                            </div>
                          </A>
                        </>
                      )}
                    </Show>
                  </div>
                </Show>
              </section>
            </Show>

            {/* Leaderboard (active/upcoming events) */}
            <Show when={!isPast()}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>Topplista</h2>
                <Show
                  when={(leaderboard() ?? []).length > 0}
                  fallback={<EmptyState icon="emoji_events" message="Inga observationer annu" />}
                >
                  <div class={styles.leaderboard}>
                    <For each={leaderboard()}>
                      {(entry, i) => (
                        <A href={`/stats/${entry.user.id}`} class={styles.lbRow}>
                          <span class={styles.lbRank}>{i() + 1}</span>
                          <Avatar name={entry.user.name} image={entry.user.image} size={32} />
                          <div class={styles.lbInfo}>
                            <span class={styles.lbName}>{entry.user.name}</span>
                            <span class={styles.lbMeta}>
                              {entry.uniqueSpecies} arter · {entry.totalObservations} obs
                            </span>
                          </div>
                        </A>
                      )}
                    </For>
                  </div>
                </Show>
              </section>
            </Show>

            {/* Participants */}
            <section class={styles.section}>
              <h2 class={styles.sectionTitle}>
                Deltagare ({ev().participants.length})
              </h2>
              <div class={styles.participants}>
                <For each={ev().participants}>
                  {(p) => (
                    <div class={styles.participant}>
                      <Avatar name={p.user.name} image={p.user.image} size={32} />
                      <span class={styles.pName}>{p.user.name}</span>
                      <span
                        class={styles.pStatus}
                        classList={{
                          [styles.accepted]: p.status === "ACCEPTED",
                          [styles.invited]: p.status === "INVITED",
                          [styles.declined]: p.status === "DECLINED",
                        }}
                      >
                        {p.status === "ACCEPTED"
                          ? "Accepterad"
                          : p.status === "INVITED"
                          ? "Inbjuden"
                          : "Avbojd"}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </section>

            {/* Invite (creator only, not past events) */}
            <Show when={isCreator() && !isPast()}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>Bjud in</h2>
                <form class={styles.inviteForm} onSubmit={handleInvite}>
                  <input
                    type="email"
                    class={styles.inviteInput}
                    placeholder="E-postadress"
                    value={inviteEmail()}
                    onInput={(e) => setInviteEmail(e.currentTarget.value)}
                  />
                  <button type="submit" class={styles.inviteBtn}>
                    Bjud in
                  </button>
                </form>
              </section>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}
