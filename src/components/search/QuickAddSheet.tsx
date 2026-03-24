import { createSignal, createEffect, Show } from "solid-js";
import type { Bird } from "../../lib/types";
import { useGeolocation } from "../../lib/useGeolocation";
import { reverseGeocode } from "../../lib/reverseGeocode";
import BottomSheet from "../BottomSheet";
import Icon from "../Icon";
import styles from "./QuickAddSheet.module.css";

type Props = {
  bird: Bird | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    note?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
};

export default function QuickAddSheet(props: Props) {
  const [note, setNote] = createSignal("");
  const [location, setLocation] = createSignal("");
  const [reverseLoading, setReverseLoading] = createSignal(false);
  const [userEdited, setUserEdited] = createSignal(false);
  const { geo, setGeo, requestPosition } = useGeolocation();

  function handleConfirm() {
    const g = geo();
    props.onConfirm({
      note: note() || undefined,
      location: location() || undefined,
      latitude: g.latitude ?? undefined,
      longitude: g.longitude ?? undefined,
    });
    setNote("");
    setLocation("");
    setUserEdited(false);
  }

  let locationRef!: HTMLInputElement;

  createEffect(() => {
    if (props.open) {
      requestPosition();
      requestAnimationFrame(() => locationRef?.focus());
    } else {
      setNote("");
      setLocation("");
      setUserEdited(false);
      setGeo({ latitude: null, longitude: null, loading: false, error: null });
    }
  });

  createEffect(() => {
    const g = geo();
    if (g.latitude && g.longitude && !userEdited()) {
      setReverseLoading(true);
      reverseGeocode(g.latitude, g.longitude).then((name) => {
        if (name && !userEdited()) setLocation(name);
        setReverseLoading(false);
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
        <button class={styles.confirmBtn} onClick={handleConfirm}>
          Kryssa!
        </button>
      </div>
    </BottomSheet>
  );
}
