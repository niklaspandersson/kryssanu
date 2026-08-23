import { createSignal, createResource, createEffect, on, Show, For, onCleanup } from "solid-js";
import { useParams } from "@solidjs/router";
import QRCode from "qrcode";
import { events as eventsApi, feed, me as meApi } from "../lib/api";
import type { LeaderboardEntry, FeedItem } from "../lib/types";
import { useAuth } from "../lib/auth";
import { isOnline } from "../lib/useOnlineStatus";
import { observationsRevision } from "../lib/observationStore";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import BottomSheet from "../components/BottomSheet";
import shared from "../styles/shared.module.css";
import styles from "./EventDetailPage.module.css";

export default function EventDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [joining, setJoining] = createSignal(false);
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [showQr, setShowQr] = createSignal(false);
  const [qrDataUrl, setQrDataUrl] = createSignal<string | null>(null);
  const [qrLoading, setQrLoading] = createSignal(false);

  const [selectedParticipant, setSelectedParticipant] = createSignal<{ id: string; name: string } | null>(null);
  const [participantPage, setParticipantPage] = createSignal(0);
  const PARTICIPANTS_PER_PAGE = 10;

  const LEADERBOARD_PAGE_SIZE = 20;
  const [leaderboardPage, setLeaderboardPage] = createSignal(0);
  const [leaderboardEntries, setLeaderboardEntries] = createSignal<LeaderboardEntry[]>([]);

  const isActive = () => {
    const ev = event();
    if (!ev) return false;
    const now = Date.now();
    return new Date(ev.startsAt).getTime() <= now && new Date(ev.endsAt).getTime() >= now;
  };

  const [event, { refetch }] = createResource(() => params.id, eventsApi.getOne);
  // Pages are appended rather than replaced, so "Visa fler" grows the list.
  // Only the current page ever crosses the wire — a large public event used to
  // send every participant at once.
  const [leaderboard] = createResource(
    () => (params.id ? { eventId: params.id, page: leaderboardPage() } : null),
    async (source) => {
      const offset = source.page * LEADERBOARD_PAGE_SIZE;
      const res = await eventsApi.leaderboard(source.eventId, {
        limit: LEADERBOARD_PAGE_SIZE,
        offset,
      });
      setLeaderboardEntries((prev) =>
        offset === 0 ? res.entries : [...prev, ...res.entries]
      );
      return res;
    }
  );
  const [memberships] = createResource(() => user(), () => meApi.memberships());
  const [participants, { refetch: refetchParticipants }] = createResource(
    () => params.id ? { eventId: params.id, offset: participantPage() * PARTICIPANTS_PER_PAGE } : null,
    (source) => eventsApi.participants(source.eventId, { limit: PARTICIPANTS_PER_PAGE, offset: source.offset })
  );
  // Same append-behind-"Visa fler" shape as the leaderboard; nextCursor used to
  // be dropped, capping the section at one page.
  const ACTIVITY_PAGE_SIZE = 10;
  const [activityCursor, setActivityCursor] = createSignal<string | null>(null);
  const [activityItems, setActivityItems] = createSignal<FeedItem[]>([]);

  const [recentActivity] = createResource(
    () =>
      isActive()
        ? { id: params.id, rev: observationsRevision(), cursor: activityCursor() }
        : null,
    async (source) => {
      const res = await feed.get({
        eventId: source.id,
        limit: ACTIVITY_PAGE_SIZE,
        cursor: source.cursor ?? undefined,
      });
      setActivityItems((prev) => (source.cursor ? [...prev, ...res.items] : res.items));
      return res;
    }
  );

  createEffect(
    on(observationsRevision, () => { setActivityCursor(null); setActivityItems([]); }, { defer: true })
  );
  const [participantObs] = createResource(
    () => {
      const p = selectedParticipant();
      return p ? { eventId: params.id, userId: p.id } : null;
    },
    (source) => eventsApi.participantObservations(source.eventId, source.userId)
  );

  const isCreator = () => event()?.creatorId === user()?.id;

  const isParticipant = () => {
    const m = memberships();
    const eid = params.id;
    if (!m || !eid) return false;
    return m[eid] === "ACCEPTED";
  };

  const isPast = () => {
    const ev = event();
    if (!ev) return false;
    return new Date(ev.endsAt).getTime() < Date.now();
  };

  const totalParticipantPages = () => {
    const ev = event();
    if (!ev) return 1;
    return Math.ceil(ev.participantCount / PARTICIPANTS_PER_PAGE);
  };

  // A finished event only ever shows a podium; an active one grows on demand.
  const resultsTop10 = () => leaderboardEntries().slice(0, 10);

  const shownLeaderboardCount = () =>
    isPast() ? Math.min(leaderboardEntries().length, 10) : leaderboardEntries().length;

  const hasMoreLeaderboard = () =>
    leaderboardEntries().length < (leaderboard()?.total ?? 0);

  // The server ranks the caller across the whole event, since a paginated
  // response no longer lets the client find them by scanning. Suppressed when
  // they are already visible in the rows above.
  const currentUserEntry = () => {
    const me = leaderboard()?.me;
    if (!me || me.rank <= shownLeaderboardCount()) return null;
    return me;
  };

  async function handleInvite(e: Event) {
    e.preventDefault();
    if (!inviteEmail()) return;
    await eventsApi.invite(params.id, inviteEmail());
    setInviteEmail("");
    refetch();
    refetchParticipants();
  }

  async function handleShowQr() {
    setQrLoading(true);
    try {
      const { url } = await eventsApi.createInviteToken(params.id);
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrDataUrl(dataUrl);
      setShowQr(true);
    } finally {
      setQrLoading(false);
    }
  }

  async function handleCloseQr() {
    setShowQr(false);
    setQrDataUrl(null);
    await eventsApi.deleteInviteToken(params.id).catch(() => {});
    refetch();
  }

  onCleanup(() => {
    if (showQr()) {
      eventsApi.deleteInviteToken(params.id).catch(() => {});
    }
  });

  return (
    <div class={shared.page}>
      <Show when={event()} fallback={<EmptyState icon="event" message="Laddar event..." />}>
        {(ev) => (
          <>
            <h1 class={shared.headingSm}>{ev().name}</h1>
            <Show when={ev().isPublic}>
              <span class={styles.publicBadge}>
                <Icon name="public" size={14} />
                Publikt
              </span>
            </Show>
            <Show when={ev().description}>
              <p class={styles.description}>{ev().description}</p>
            </Show>
            <div class={styles.dates}>
              <Icon name="schedule" size={16} />
              {new Date(ev().startsAt).toLocaleDateString("sv-SE")} -{" "}
              {new Date(ev().endsAt).toLocaleDateString("sv-SE")}
            </div>

            {/* Join button (public events, non-participants, non-past) */}
            <Show when={ev().isPublic && !isParticipant() && !isPast()}>
              <button
                class={styles.joinBtn}
                onClick={async () => {
                  setJoining(true);
                  try {
                    await eventsApi.join(params.id);
                    refetch();
                  } finally {
                    setJoining(false);
                  }
                }}
                disabled={joining() || !isOnline()}
              >
                <Icon name={isOnline() ? "group_add" : "cloud_off"} size={20} />
                {!isOnline() ? "Offline – kan inte gå med" : joining() ? "Går med..." : "Gå med i eventet"}
              </button>
            </Show>

            {/* Observation notice (active events, participants only) */}
            <Show when={isActive() && isParticipant()}>
              <div class={styles.obsNotice}>
                <Icon name="info" size={20} />
                <p>
                  Alla observationer du registrerar under eventets tidsperiod
                  räknas automatiskt med i eventet.
                </p>
              </div>
            </Show>

            {/* Results (past events) */}
            <Show when={isPast()}>
              <section class={shared.section}>
                <h2 class={shared.sectionTitle}>Resultat</h2>
                <Show
                  when={isOnline()}
                  fallback={
                    <div class={shared.offlineBox}>
                      <Icon name="cloud_off" size={24} />
                      <p class={shared.offlineText}>Resultat är inte tillgängliga offline.</p>
                    </div>
                  }
                >
                  <Show
                    when={resultsTop10().length > 0}
                    fallback={<EmptyState icon="emoji_events" message="Inga observationer registrerades" />}
                  >
                    <div class={styles.leaderboard}>
                      <For each={resultsTop10()}>
                        {(entry, i) => (
                          <div class={styles.lbRow} data-testid="leaderboard-row" data-rank={i() + 1} data-user-id={entry.user.id} onClick={() => setSelectedParticipant({ id: entry.user.id, name: entry.user.name ?? "Deltagare" })}>
                            <span class={styles.lbRank}>{i() + 1}</span>
                            <Avatar name={entry.user.name} image={entry.user.image} size={32} />
                            <div class={styles.lbInfo}>
                              <span class={styles.lbName}>{entry.user.name}</span>
                              <span class={styles.lbMeta}>
                                {entry.uniqueSpecies} arter · {entry.totalObservations} observationer
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                      {/* Current user if outside top 10 */}
                      <Show when={currentUserEntry()}>
                        {(cu) => (
                          <>
                            <div class={styles.lbDivider}>···</div>
                            <div class={`${styles.lbRow} ${styles.lbRowHighlight}`} data-testid="leaderboard-row-me" data-user-id={cu().entry.user.id} onClick={() => setSelectedParticipant({ id: cu().entry.user.id, name: cu().entry.user.name ?? "Deltagare" })}>
                              <span class={styles.lbRank}>{cu().rank}</span>
                              <Avatar name={cu().entry.user.name} image={cu().entry.user.image} size={32} />
                              <div class={styles.lbInfo}>
                                <span class={styles.lbName}>{cu().entry.user.name}</span>
                                <span class={styles.lbMeta}>
                                  {cu().entry.uniqueSpecies} arter · {cu().entry.totalObservations} observationer
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </Show>
                    </div>
                  </Show>
                </Show>
              </section>
            </Show>

            {/* Leaderboard (active events) */}
            <Show when={isActive()}>
              <section class={shared.section}>
                <h2 class={shared.sectionTitle}>Topplista</h2>
                <Show
                  when={isOnline()}
                  fallback={
                    <div class={shared.offlineBox}>
                      <Icon name="cloud_off" size={24} />
                      <p class={shared.offlineText}>Topplistan är inte tillgänglig offline.</p>
                    </div>
                  }
                >
                  <Show
                    when={leaderboardEntries().length > 0}
                    fallback={<EmptyState icon="emoji_events" message="Inga observationer annu" />}
                  >
                    <div class={styles.leaderboard}>
                      <For each={leaderboardEntries()}>
                        {(entry, i) => (
                          <div class={styles.lbRow} data-testid="leaderboard-row" data-rank={i() + 1} data-user-id={entry.user.id} onClick={() => setSelectedParticipant({ id: entry.user.id, name: entry.user.name ?? "Deltagare" })}>
                            <span class={styles.lbRank}>{i() + 1}</span>
                            <Avatar name={entry.user.name} image={entry.user.image} size={32} />
                            <div class={styles.lbInfo}>
                              <span class={styles.lbName}>{entry.user.name}</span>
                              <span class={styles.lbMeta}>
                                {entry.uniqueSpecies} arter · {entry.totalObservations} observationer
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                      {/* Current user, when they rank below the loaded rows */}
                      <Show when={currentUserEntry()}>
                        {(cu) => (
                          <>
                            <div class={styles.lbDivider}>···</div>
                            <div class={`${styles.lbRow} ${styles.lbRowHighlight}`} data-testid="leaderboard-row-me" data-user-id={cu().entry.user.id} onClick={() => setSelectedParticipant({ id: cu().entry.user.id, name: cu().entry.user.name ?? "Deltagare" })}>
                              <span class={styles.lbRank}>{cu().rank}</span>
                              <Avatar name={cu().entry.user.name} image={cu().entry.user.image} size={32} />
                              <div class={styles.lbInfo}>
                                <span class={styles.lbName}>{cu().entry.user.name}</span>
                                <span class={styles.lbMeta}>
                                  {cu().entry.uniqueSpecies} arter · {cu().entry.totalObservations} observationer
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </Show>
                    </div>
                    <Show when={hasMoreLeaderboard()}>
                      <button
                        class={styles.loadMoreBtn}
                        disabled={leaderboard.loading}
                        onClick={() => setLeaderboardPage((p) => p + 1)}
                      >
                        {leaderboard.loading
                          ? "Laddar..."
                          : `Visa fler (${leaderboardEntries().length} av ${leaderboard()?.total ?? 0})`}
                      </button>
                    </Show>
                  </Show>
                </Show>
              </section>
            </Show>

            {/* Recent activity (active events) */}
            <Show when={isActive()}>
              <section class={shared.section}>
                <h2 class={shared.sectionTitle}>Senaste aktivitet</h2>
                <Show
                  when={isOnline()}
                  fallback={
                    <div class={shared.offlineBox}>
                      <Icon name="cloud_off" size={24} />
                      <p class={shared.offlineText}>Senaste aktivitet är inte tillgänglig offline.</p>
                    </div>
                  }
                >
                  <Show when={activityItems().length > 0}>
                    <For each={activityItems()}>
                      {(item) => (
                        <div class={shared.activityItem}>
                          <Avatar name={item.user.name} image={item.user.image} size={28} />
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
                    <Show when={recentActivity()?.nextCursor}>
                      <button
                        class={styles.loadMoreBtn}
                        disabled={recentActivity.loading}
                        onClick={() => setActivityCursor(recentActivity()!.nextCursor)}
                      >
                        {recentActivity.loading ? "Laddar..." : "Visa fler"}
                      </button>
                    </Show>
                  </Show>
                </Show>
              </section>
            </Show>

            {/* Participants */}
            <section class={shared.section}>
              <h2 class={shared.sectionTitle}>
                Deltagare ({ev().participantCount})
              </h2>
              <div class={styles.participants}>
                <For each={participants() ?? []}>
                  {(p) => (
                    <div
                      class={styles.participant}
                      data-testid="participant"
                      data-user-id={p.user.id}
                      data-status={p.status}
                      classList={{ [styles.clickable]: p.status === "ACCEPTED" && (isActive() || isPast()) }}
                      onClick={() => {
                        if (p.status === "ACCEPTED" && (isActive() || isPast())) {
                          setSelectedParticipant({ id: p.user.id, name: p.user.name ?? "Deltagare" });
                        }
                      }}
                    >
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
              <Show when={totalParticipantPages() > 1}>
                <div class={styles.pagination}>
                  <button
                    class={styles.pageBtn}
                    disabled={participantPage() === 0}
                    onClick={() => setParticipantPage((p) => p - 1)}
                  >
                    <Icon name="chevron_left" size={18} />
                    Föregående
                  </button>
                  <span class={styles.pageInfo}>
                    {participantPage() + 1} / {totalParticipantPages()}
                  </span>
                  <button
                    class={styles.pageBtn}
                    disabled={participantPage() >= totalParticipantPages() - 1}
                    onClick={() => setParticipantPage((p) => p + 1)}
                  >
                    Nästa
                    <Icon name="chevron_right" size={18} />
                  </button>
                </div>
              </Show>
            </section>

            {/* Invite (creator only, not past events, online only) */}
            <Show when={isCreator() && !isPast() && isOnline()}>
              <section class={shared.section}>
                <h2 class={shared.sectionTitle}>Bjud in</h2>
                <button
                  class={styles.qrBtn}
                  onClick={handleShowQr}
                  disabled={qrLoading()}
                >
                  <Icon name="qr_code_2" size={20} />
                  {qrLoading() ? "Laddar..." : "Visa QR-kod"}
                </button>
              </section>
            </Show>

            {/* QR Code Modal */}
            <Show when={showQr() && qrDataUrl()}>
              <div class={styles.qrOverlay} onClick={handleCloseQr}>
                <div class={styles.qrModal} onClick={(e) => e.stopPropagation()}>
                  <h3 class={styles.qrTitle}>Skanna för att gå med</h3>
                  <img
                    class={styles.qrImage}
                    src={qrDataUrl()!}
                    alt="QR-kod för inbjudan"
                  />
                  <p class={styles.qrEventName}>{ev().name}</p>
                  <p class={styles.qrNotice}>
                    Inbjudan gäller i upp till 5 minuter efter att du stängt
                    QR-koden.
                  </p>
                  <button class={styles.qrCloseBtn} onClick={handleCloseQr}>
                    Stäng
                  </button>
                </div>
              </div>
            </Show>
          </>
        )}
      </Show>

      <BottomSheet
        open={!!selectedParticipant()}
        onClose={() => setSelectedParticipant(null)}
        title={`${selectedParticipant()?.name ?? ""} – observationer`}
      >
        <Show
          when={!participantObs.loading}
          fallback={<p class={styles.obsLoading}>Laddar observationer...</p>}
        >
          <Show
            when={(participantObs()?.observations ?? []).length > 0}
            fallback={<EmptyState icon="visibility_off" message="Inga observationer i detta event" />}
          >
            <Show when={participantObs()!.total > participantObs()!.observations.length}>
              <p class={styles.obsCount}>
                Visar {participantObs()!.observations.length} av {participantObs()!.total}
              </p>
            </Show>
            <div class={styles.obsList}>
              <For each={participantObs()?.observations}>
                {(obs) => (
                  <div class={styles.obsItem}>
                    <span class={styles.obsSpecies}>{obs.bird.swedish}</span>
                    <span class={styles.obsMeta}>
                      {new Date(obs.date).toLocaleDateString("sv-SE")}
                      <Show when={obs.location}>
                        {(loc) => <> · {loc()}</>}
                      </Show>
                    </span>
                    <Show when={obs.note}>
                      {(n) => <p class={styles.obsNote}>{n()}</p>}
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </BottomSheet>
    </div>
  );
}
