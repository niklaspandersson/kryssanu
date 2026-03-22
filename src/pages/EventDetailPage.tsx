import { createSignal, createResource, Show, For, onCleanup } from "solid-js";
import { useParams, A } from "@solidjs/router";
import QRCode from "qrcode";
import { events as eventsApi, feed, me as meApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { openSearch } from "../components/AppShell";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import BottomSheet from "../components/BottomSheet";
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

  const isActive = () => {
    const ev = event();
    if (!ev) return false;
    const now = Date.now();
    return new Date(ev.startsAt).getTime() <= now && new Date(ev.endsAt).getTime() >= now;
  };

  const [event, { refetch }] = createResource(() => params.id, eventsApi.getOne);
  const [leaderboard] = createResource(() => params.id, eventsApi.leaderboard);
  const [memberships] = createResource(() => user(), () => meApi.memberships());
  const [participants, { refetch: refetchParticipants }] = createResource(
    () => params.id ? { eventId: params.id, offset: participantPage() * PARTICIPANTS_PER_PAGE } : null,
    (source) => eventsApi.participants(source.eventId, { limit: PARTICIPANTS_PER_PAGE, offset: source.offset })
  );
  const [recentActivity] = createResource(
    () => (isActive() ? params.id : null),
    (eventId) => feed.get({ eventId, limit: 10 })
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
    <div class={styles.page}>
      <A href="/events" class={styles.back}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </A>

      <Show when={event()} fallback={<EmptyState icon="event" message="Laddar event..." />}>
        {(ev) => (
          <>
            <h1 class={styles.heading}>{ev().name}</h1>
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
                disabled={joining()}
              >
                <Icon name="group_add" size={20} />
                {joining() ? "Går med..." : "Gå med i eventet"}
              </button>
            </Show>

            {/* Add observation (active events, participants only) */}
            <Show when={isActive() && isParticipant()}>
              <button
                class={styles.addObsBtn}
                onClick={() => openSearch()}
              >
                <Icon name="add" size={20} />
                Lägg till observation
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
                        <div class={styles.lbRow} onClick={() => setSelectedParticipant({ id: entry.user.id, name: entry.user.name ?? "Deltagare" })}>
                          <span class={styles.lbRank}>{i() + 1}</span>
                          <Avatar name={entry.user.name} image={entry.user.image} size={32} />
                          <div class={styles.lbInfo}>
                            <span class={styles.lbName}>{entry.user.name}</span>
                            <span class={styles.lbMeta}>
                              {entry.uniqueSpecies} arter · {entry.totalObservations} obs
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
                          <div class={`${styles.lbRow} ${styles.lbRowHighlight}`} onClick={() => setSelectedParticipant({ id: cu().entry.user.id, name: cu().entry.user.name ?? "Deltagare" })}>
                            <span class={styles.lbRank}>{cu().rank}</span>
                            <Avatar name={cu().entry.user.name} image={cu().entry.user.image} size={32} />
                            <div class={styles.lbInfo}>
                              <span class={styles.lbName}>{cu().entry.user.name}</span>
                              <span class={styles.lbMeta}>
                                {cu().entry.uniqueSpecies} arter · {cu().entry.totalObservations} obs
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </Show>
                  </div>
                </Show>
              </section>
            </Show>

            {/* Leaderboard (active events) */}
            <Show when={isActive()}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>Topplista</h2>
                <Show
                  when={(leaderboard() ?? []).length > 0}
                  fallback={<EmptyState icon="emoji_events" message="Inga observationer annu" />}
                >
                  <div class={styles.leaderboard}>
                    <For each={leaderboard()}>
                      {(entry, i) => (
                        <div class={styles.lbRow} onClick={() => setSelectedParticipant({ id: entry.user.id, name: entry.user.name ?? "Deltagare" })}>
                          <span class={styles.lbRank}>{i() + 1}</span>
                          <Avatar name={entry.user.name} image={entry.user.image} size={32} />
                          <div class={styles.lbInfo}>
                            <span class={styles.lbName}>{entry.user.name}</span>
                            <span class={styles.lbMeta}>
                              {entry.uniqueSpecies} arter · {entry.totalObservations} obs
                            </span>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </section>
            </Show>

            {/* Recent activity (active events) */}
            <Show when={isActive() && (recentActivity()?.items ?? []).length > 0}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>Senaste aktivitet</h2>
                <For each={recentActivity()!.items}>
                  {(item) => (
                    <div class={styles.activityItem}>
                      <Avatar name={item.user.name} image={item.user.image} size={28} />
                      <div class={styles.activityContent}>
                        <span>
                          <span class={styles.activityUser}>{item.user.name}</span>
                          {" "}kryssade{" "}
                          <span class={styles.activityBird}>{item.bird.swedish}</span>
                        </span>
                        <span class={styles.activityDate}>
                          {new Date(item.date).toLocaleDateString("sv-SE")}
                        </span>
                      </div>
                    </div>
                  )}
                </For>
              </section>
            </Show>

            {/* Participants */}
            <section class={styles.section}>
              <h2 class={styles.sectionTitle}>
                Deltagare ({ev().participantCount})
              </h2>
              <div class={styles.participants}>
                <For each={participants() ?? []}>
                  {(p) => (
                    <div
                      class={styles.participant}
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

            {/* Invite (creator only, not past events) */}
            <Show when={isCreator() && !isPast()}>
              <section class={styles.section}>
                <h2 class={styles.sectionTitle}>Bjud in</h2>
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
            when={(participantObs() ?? []).length > 0}
            fallback={<EmptyState icon="visibility_off" message="Inga observationer i detta event" />}
          >
            <div class={styles.obsList}>
              <For each={participantObs()}>
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
