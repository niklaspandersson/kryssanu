import {
  createSignal,
  createResource,
  createMemo,
  createEffect,
  onCleanup,
  Show,
  For,
} from "solid-js";
import { A, useParams } from "@solidjs/router";
import { me as meApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { setSearchFabHidden } from "../components/AppShell";
import { userLists, refreshLists } from "../lib/listStore";
import { allBirds } from "../lib/birdStore";
import type {
  ObservationWithBird,
  UpdateObservationInput,
} from "../lib/types";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import EditObservationSheet from "../components/observations/EditObservationSheet";
import BulkEditSheet, {
  type BulkMode,
  type BulkApply,
} from "../components/observations/BulkEditSheet";
import shared from "../styles/shared.module.css";
import styles from "./ObservationsPage.module.css";

const PAGE_SIZE = 100;

const longDateFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const shortDate = (d: string) => new Date(d).toLocaleDateString("sv-SE");

type ConfirmConfig = {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export default function ObservationsPage() {
  const { isLoggedIn } = useAuth();
  const params = useParams();
  const [page, setPage] = createSignal(0);

  // Solid Router does not URL-decode route params, and bird IDs are latin
  // species names containing spaces — decode before filtering.
  const listId = () => params.listId;
  const birdId = () => (params.birdId ? decodeURIComponent(params.birdId) : undefined);

  // Reset to the first page whenever the active filter changes so we never land
  // on an out-of-range offset for the new (smaller) result set.
  createEffect(() => {
    listId();
    birdId();
    setPage(0);
  });

  const [data, { refetch, mutate }] = createResource(
    () =>
      isLoggedIn()
        ? { page: page(), listId: listId(), birdId: birdId() }
        : undefined,
    ({ page: p, listId, birdId }) =>
      meApi.allObservations({
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
        listId,
        birdId,
      })
  );

  // Contextual header: list name / species name for filtered views.
  const activeList = createMemo(() =>
    listId() ? userLists().find((l) => l.id === listId()) : undefined
  );
  const activeBird = createMemo(() =>
    birdId() ? allBirds().find((b) => b.id === birdId()) : undefined
  );
  // The main title is always the same; filtered views get a descriptive
  // subtitle naming the active list or species instead.
  const subtitle = () => {
    if (listId()) return `Lista: ${activeList()?.name ?? "Lista"}`;
    if (birdId()) return `Art: ${activeBird()?.swedish ?? "Art"}`;
    return undefined;
  };

  const observations = () => data()?.observations ?? [];
  const total = () => data()?.total ?? 0;
  const pageCount = () => Math.max(1, Math.ceil(total() / PAGE_SIZE));
  const rangeStart = () => (total() === 0 ? 0 : page() * PAGE_SIZE + 1);
  const rangeEnd = () => Math.min((page() + 1) * PAGE_SIZE, total());

  const listById = createMemo(() =>
    Object.fromEntries(userLists().map((l) => [l.id, l]))
  );

  // ── view / selection state ──
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set());
  const [selectMode, setSelectMode] = createSignal(false);
  const [selected, setSelected] = createSignal<Set<string>>(new Set());

  // ── edit state ──
  const [editing, setEditing] = createSignal<ObservationWithBird | null>(null);
  const [bulkMode, setBulkMode] = createSignal<BulkMode | null>(null);
  const [confirm, setConfirm] = createSignal<ConfirmConfig | null>(null);
  const [saving, setSaving] = createSignal(false);

  // ── toast ──
  const [toast, setToast] = createSignal<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  function showToast(msg: string) {
    clearTimeout(toastTimer);
    setToast(msg);
    toastTimer = setTimeout(() => setToast(null), 2600);
  }

  const selectedObs = createMemo(() =>
    observations().filter((o) => selected().has(o.id))
  );

  // Hide the floating search FAB while the bulk action bar occupies the bottom.
  createEffect(() => setSearchFabHidden(selectMode() && selected().size > 0));
  onCleanup(() => setSearchFabHidden(false));

  function goTo(p: number) {
    setPage(Math.max(0, Math.min(p, pageCount() - 1)));
    setExpanded(new Set<string>());
    window.scrollTo({ top: 0 });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function enterSelect() {
    setSelectMode(true);
    setExpanded(new Set<string>());
  }
  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set<string>());
  }
  const allSelected = () => total() > 0 && selected().size === observations().length;
  function toggleAll() {
    setSelected(
      allSelected() ? new Set<string>() : new Set(observations().map((o) => o.id))
    );
  }

  // ── single edit ──
  async function saveEdit(input: UpdateObservationInput) {
    const obs = editing();
    if (!obs) return;
    setSaving(true);
    try {
      await meApi.updateObservation(obs.id, input);
      await refetch();
      refreshLists();
      setEditing(null);
      showToast("Observation uppdaterad");
    } finally {
      setSaving(false);
    }
  }

  function deleteOne(obs: ObservationWithBird) {
    setConfirm({
      title: "Ta bort observation?",
      text: `${obs.bird.swedish}${obs.location ? " · " + obs.location : ""} (${shortDate(
        obs.date
      )}) tas bort permanent. Detta går inte att ångra.`,
      confirmLabel: "Ta bort",
      onConfirm: async () => {
        setSaving(true);
        try {
          await meApi.deleteObservation(obs.id);
          await refetch();
          refreshLists();
          setConfirm(null);
          setEditing(null);
          showToast("Observation borttagen");
        } finally {
          setSaving(false);
        }
      },
    });
  }

  // ── bulk apply ──
  async function applyBulk(payload: BulkApply) {
    const ids = [...selected()];
    if (ids.length === 0) return;

    if (payload.op === "addList" || payload.op === "removeList") {
      // optimistic local update so the chip tri-state reacts instantly
      const sel = selected();
      mutate((prev) =>
        prev
          ? {
              ...prev,
              observations: prev.observations.map((o) => {
                if (!sel.has(o.id)) return o;
                const cur = o.listIds ?? [];
                const next =
                  payload.op === "addList"
                    ? Array.from(new Set([...cur, payload.value]))
                    : cur.filter((x) => x !== payload.value);
                return { ...o, listIds: next };
              }),
            }
          : prev
      );
      try {
        await meApi.bulkObservations({ ids, op: payload.op, value: payload.value });
      } catch {
        refetch();
      }
      return;
    }

    setSaving(true);
    try {
      await meApi.bulkObservations({ ids, ...payload } as Parameters<
        typeof meApi.bulkObservations
      >[0]);
      await refetch();
      refreshLists();
      setBulkMode(null);
      const n = ids.length;
      showToast(
        payload.op === "setLocation"
          ? `Plats satt för ${n} ${n === 1 ? "observation" : "observationer"}`
          : `Datum satt för ${n} ${n === 1 ? "observation" : "observationer"}`
      );
    } finally {
      setSaving(false);
    }
  }

  function deleteBulk() {
    const n = selected().size;
    setConfirm({
      title: `Ta bort ${n} ${n === 1 ? "observation" : "observationer"}?`,
      text: "De valda observationerna tas bort permanent. Detta går inte att ångra.",
      confirmLabel: `Ta bort ${n}`,
      onConfirm: async () => {
        const ids = [...selected()];
        setSaving(true);
        try {
          await meApi.bulkObservations({ ids, op: "delete" });
          await refetch();
          refreshLists();
          setConfirm(null);
          exitSelect();
          showToast(`${n} ${n === 1 ? "observation" : "observationer"} borttagna`);
        } finally {
          setSaving(false);
        }
      },
    });
  }

  return (
    <div class={shared.page}>
      <div class={styles.pageHeader}>
        <div class={styles.headingGroup}>
          <h1 class={shared.heading}>Mina observationer</h1>
          <Show when={subtitle()}>
            {(sub) => <p class={styles.subtitle}>{sub()}</p>}
          </Show>
        </div>
        <Show when={total() > 0}>
          <button
            class={styles.selectBtn}
            classList={{ [styles.selectBtnActive]: selectMode() }}
            onClick={() => (selectMode() ? exitSelect() : enterSelect())}
          >
            <Icon name={selectMode() ? "close" : "checklist"} size={18} />
            {selectMode() ? "Klar" : "Markera"}
          </button>
        </Show>
      </div>

      <Show
        when={!data.loading || data()}
        fallback={<EmptyState icon="visibility" message="Laddar observationer..." />}
      >
        <Show
          when={total() > 0}
          fallback={
            <EmptyState
              icon="visibility_off"
              message={
                listId()
                  ? "Inga observationer i den här listan ännu. Välj listan när du registrerar en ny observation."
                  : birdId()
                  ? "Du har inga observationer av den här arten ännu."
                  : "Du har inga observationer än. Sök efter en fågel och registrera ditt första kryss."
              }
            />
          }
        >
          <p class={styles.summary}>
            Visar {rangeStart()}–{rangeEnd()} av {total()}
          </p>

          <Show when={selectMode()}>
            <div class={styles.selectAllRow}>
              <span
                class={styles.checkCell}
                onClick={toggleAll}
                role="checkbox"
                aria-checked={allSelected()}
              >
                <span class={styles.checkbox} classList={{ [styles.checkboxChecked]: allSelected() }}>
                  <Icon name="check" size={16} />
                </span>
              </span>
              <button class={styles.linkBtn} onClick={toggleAll}>
                {allSelected() ? "Avmarkera alla" : "Markera alla"}
              </button>
            </div>
          </Show>

          <Pagination page={page()} pageCount={pageCount()} onGoTo={goTo} />

          <ul class={styles.obsList}>
            <For each={observations()}>
              {(obs) => {
                const isOpen = () => expanded().has(obs.id);
                const isSel = () => selected().has(obs.id);
                const obsLists = () =>
                  (obs.listIds ?? []).map((id) => listById()[id]).filter(Boolean);
                return (
                  <li
                    class={styles.obsItem}
                    classList={{ [styles.rowSelectable]: selectMode() }}
                  >
                    <Show when={selectMode()}>
                      <span
                        class={styles.checkCell}
                        onClick={() => toggleSelect(obs.id)}
                        role="checkbox"
                        aria-checked={isSel()}
                      >
                        <span class={styles.checkbox} classList={{ [styles.checkboxChecked]: isSel() }}>
                          <Icon name="check" size={16} />
                        </span>
                      </span>
                    </Show>

                    <div class={styles.obsMain}>
                      <div
                        class={styles.obsRow}
                        role="button"
                        tabindex="0"
                        aria-expanded={isOpen()}
                        onClick={() =>
                          selectMode() ? toggleSelect(obs.id) : toggleExpand(obs.id)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectMode() ? toggleSelect(obs.id) : toggleExpand(obs.id);
                          }
                        }}
                      >
                        <span class={styles.obsContent}>
                          <A
                            href={`/birds/${encodeURIComponent(obs.bird.id)}`}
                            class={styles.obsBird}
                            onClick={(e) => {
                              // Navigate to the bird, but in select mode keep the
                              // tap as a row selection instead.
                              if (selectMode()) {
                                e.preventDefault();
                                toggleSelect(obs.id);
                              } else {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {obs.bird.swedish}
                          </A>
                          <Show when={obs.location}>
                            {(loc) => <span class={styles.obsLocation}> · {loc()}</span>}
                          </Show>
                          <Show when={obsLists().length > 0}>
                            <span class={styles.obsListTags}>
                              <For each={obsLists()}>
                                {(l) => <span class={styles.listTagDot}>{l!.name}</span>}
                              </For>
                            </span>
                          </Show>
                          <Show when={obs.image}>
                            <Icon
                              name="image"
                              size={16}
                              class={styles.obsImageIcon}
                            />
                          </Show>
                        </span>
                        <span class={styles.obsDate}>{shortDate(obs.date)}</span>
                        <Show when={!selectMode()}>
                          <Icon
                            name="expand_more"
                            size={18}
                            class={isOpen() ? styles.chevronOpen : styles.chevron}
                          />
                        </Show>
                      </div>

                      <Show when={isOpen() && !selectMode()}>
                        <dl class={styles.details}>
                          <dt>Art</dt>
                          <dd>
                            {obs.bird.swedish}{" "}
                            <span class={styles.muted}>({obs.bird.family})</span>
                          </dd>
                          <dt>Datum</dt>
                          <dd>{longDateFmt.format(new Date(obs.date))}</dd>
                          <dt>Plats</dt>
                          <dd>{obs.location || <span class={styles.muted}>—</span>}</dd>
                          <dt>Anteckning</dt>
                          <dd>{obs.note || <span class={styles.muted}>—</span>}</dd>
                          <dt>Listor</dt>
                          <dd>
                            <Show
                              when={obsLists().length > 0}
                              fallback={<span class={styles.muted}>—</span>}
                            >
                              <For each={obsLists()}>
                                {(l) => <span class={styles.chipInline}>{l!.name}</span>}
                              </For>
                            </Show>
                          </dd>
                          <Show when={obs.image}>
                            {(img) => (
                              <>
                                <dt>Bild</dt>
                                <dd>
                                  <img
                                    class={styles.detailImage}
                                    src={img().url}
                                    alt={obs.bird.swedish}
                                    loading="lazy"
                                  />
                                </dd>
                              </>
                            )}
                          </Show>
                          <div class={styles.detailActions}>
                            <button class={styles.editBtn} onClick={() => setEditing(obs)}>
                              <Icon name="edit" size={18} /> Ändra
                            </button>
                            <button
                              class={styles.editBtn}
                              classList={{ [styles.editBtnDanger]: true }}
                              onClick={() => deleteOne(obs)}
                            >
                              <Icon name="delete" size={18} /> Ta bort
                            </button>
                          </div>
                        </dl>
                      </Show>
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>

          <Pagination page={page()} pageCount={pageCount()} onGoTo={goTo} />
        </Show>
      </Show>

      {/* Bulk action bar */}
      <Show when={selectMode() && selected().size > 0}>
        <div class={styles.actionBar}>
          <div class={styles.barCount}>
            <span class={styles.barCountNum}>{selected().size}</span>
            <span class={styles.barCountLabel}>
              {selected().size === 1 ? "vald" : "valda"}
            </span>
          </div>
          <div class={styles.barActions}>
            <button class={styles.barBtn} onClick={() => setBulkMode("location")}>
              <Icon name="place" size={18} />
              <span>Plats</span>
            </button>
            <button class={styles.barBtn} onClick={() => setBulkMode("date")}>
              <Icon name="event" size={18} />
              <span>Datum</span>
            </button>
            <Show when={userLists().length > 0}>
              <button class={styles.barBtn} onClick={() => setBulkMode("lists")}>
                <Icon name="playlist_add" size={18} />
                <span>Lista</span>
              </button>
            </Show>
            <div class={styles.barDivider} />
            <button
              class={styles.barBtn}
              classList={{ [styles.barBtnDanger]: true }}
              onClick={deleteBulk}
            >
              <Icon name="delete" size={18} />
              <span>Ta bort</span>
            </button>
          </div>
          <button class={styles.barClose} onClick={exitSelect} aria-label="Avbryt">
            <Icon name="close" size={20} />
          </button>
        </div>
      </Show>

      {/* Single edit sheet */}
      <Show when={editing()}>
        {(obs) => (
          <EditObservationSheet
            obs={obs()}
            lists={userLists()}
            saving={saving()}
            onClose={() => setEditing(null)}
            onSave={saveEdit}
            onDelete={() => deleteOne(obs())}
            onImageChanged={() => refetch()}
          />
        )}
      </Show>

      {/* Bulk sheets */}
      <Show when={bulkMode()}>
        {(mode) => (
          <BulkEditSheet
            mode={mode()}
            count={selected().size}
            lists={userLists()}
            selectedObs={selectedObs()}
            saving={saving()}
            onClose={() => {
              setBulkMode(null);
              refreshLists();
            }}
            onApply={applyBulk}
          />
        )}
      </Show>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirm()}
        title={confirm()?.title ?? ""}
        text={confirm()?.text ?? ""}
        confirmLabel={confirm()?.confirmLabel ?? ""}
        busy={saving()}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm()?.onConfirm()}
      />

      <Toast message={toast()} />
    </div>
  );
}

function Pagination(props: {
  page: number;
  pageCount: number;
  onGoTo: (p: number) => void;
}) {
  return (
    <Show when={props.pageCount > 1}>
      <div class={styles.pagination}>
        <button
          class={styles.pageBtn}
          onClick={() => props.onGoTo(props.page - 1)}
          disabled={props.page === 0}
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <span class={styles.pageInfo}>
          Sida {props.page + 1} av {props.pageCount}
        </span>
        <button
          class={styles.pageBtn}
          onClick={() => props.onGoTo(props.page + 1)}
          disabled={props.page >= props.pageCount - 1}
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </Show>
  );
}
