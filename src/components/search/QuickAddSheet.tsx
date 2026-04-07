import { createSignal, createEffect, onCleanup, Show, For } from "solid-js";
import type { Bird, ListWithDetails } from "../../lib/types";
import { useGeolocation } from "../../lib/useGeolocation";
import { reverseGeocode } from "../../lib/reverseGeocode";
import BottomSheet from "../BottomSheet";
import Icon from "../Icon";
import styles from "./QuickAddSheet.module.css";

type Props = {
  bird: Bird | null;
  open: boolean;
  lists?: ListWithDetails[];
  onClose: () => void;
  onConfirm: (data: {
    note?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    listIds?: string[];
  }) => void;
};

export default function QuickAddSheet(props: Props) {
  const [note, setNote] = createSignal("");
  const [location, setLocation] = createSignal("");
  const [reverseLoading, setReverseLoading] = createSignal(false);
  const [userEdited, setUserEdited] = createSignal(false);
  const [selectedListIds, setSelectedListIds] = createSignal<string[]>([]);
  const { geo, setGeo, requestPosition } = useGeolocation();

  function toggleList(id: string) {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleConfirm() {
    const g = geo();
    const ids = selectedListIds();
    props.onConfirm({
      note: note() || undefined,
      location: location() || undefined,
      latitude: g.latitude ?? undefined,
      longitude: g.longitude ?? undefined,
      listIds: ids.length > 0 ? ids : undefined,
    });
    setNote("");
    setLocation("");
    setSelectedListIds([]);
    setUserEdited(false);
  }

  let locationRef!: HTMLInputElement;
  let geocodeAbort: AbortController | null = null;

  function cancelGeocode() {
    geocodeAbort?.abort();
    geocodeAbort = null;
    setReverseLoading(false);
  }

  onCleanup(cancelGeocode);

  createEffect(() => {
    if (props.open) {
      requestPosition();
      requestAnimationFrame(() => locationRef?.focus());
    } else {
      cancelGeocode();
      setNote("");
      setLocation("");
      setSelectedListIds([]);
      setUserEdited(false);
      setGeo({ latitude: null, longitude: null, loading: false, error: null });
    }
  });

  createEffect(() => {
    const g = geo();
    if (!props.open) return;
    if (g.latitude && g.longitude && !userEdited()) {
      cancelGeocode();
      const ctrl = new AbortController();
      geocodeAbort = ctrl;
      setReverseLoading(true);
      reverseGeocode(g.latitude, g.longitude, ctrl.signal).then((name) => {
        if (ctrl.signal.aborted || geocodeAbort !== ctrl) return;
        geocodeAbort = null;
        setReverseLoading(false);
        if (name && !userEdited() && props.open) setLocation(name);
      });
    }
  });

  return (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      title={props.bird?.swedish ?? ""}
    >
      <div class={styles.form}>
        <div class={styles.locationRow}>
          <input
            ref={locationRef}
            type="text"
            class={styles.input}
            placeholder="Plats (valfri)"
            value={location()}
            onInput={(e) => {
              setUserEdited(true);
              setLocation(e.currentTarget.value);
            }}
          />
          <Show when={geo().loading || reverseLoading()}>
            <span class={`${styles.geoIcon} ${styles.geoLoading}`}>
              <Icon name="my_location" size={20} />
            </span>
          </Show>
          <Show when={!geo().loading && !reverseLoading() && geo().latitude !== null}>
            <span class={styles.geoIcon}>
              <Icon name="my_location" size={20} />
            </span>
          </Show>
          <Show when={!geo().loading && geo().error}>
            <span class={`${styles.geoIcon} ${styles.geoError}`}>
              <Icon name="location_disabled" size={20} />
            </span>
          </Show>
        </div>
        <input
          type="text"
          class={styles.input}
          placeholder="Anteckning (valfri)"
          value={note()}
          onInput={(e) => setNote(e.currentTarget.value)}
        />
        <Show when={(props.lists ?? []).length > 0}>
          <div class={styles.listChips}>
            <For each={props.lists}>
              {(list) => (
                <button
                  type="button"
                  class={styles.listChip}
                  classList={{
                    [styles.listChipActive]: selectedListIds().includes(list.id),
                  }}
                  onClick={() => toggleList(list.id)}
                >
                  {list.name}
                </button>
              )}
            </For>
          </div>
        </Show>
        <button class={styles.confirmBtn} onClick={handleConfirm}>
          Kryssa!
        </button>
      </div>
    </BottomSheet>
  );
}
