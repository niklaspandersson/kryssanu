import { createSignal, createEffect, onCleanup, Show, For } from "solid-js";
import type { Bird, ListWithDetails } from "../../lib/types";
import { useGeolocation } from "../../lib/useGeolocation";
import { reverseGeocode } from "../../lib/reverseGeocode";
import { downscaleImage } from "../../lib/downscaleImage";
import TopSheet from "../TopSheet";
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
    image?: File;
  }) => void;
};

export default function QuickAddSheet(props: Props) {
  const [note, setNote] = createSignal("");
  const [location, setLocation] = createSignal("");
  const [reverseLoading, setReverseLoading] = createSignal(false);
  const [userEdited, setUserEdited] = createSignal(false);
  const [selectedListIds, setSelectedListIds] = createSignal<string[]>([]);
  const [imageFile, setImageFile] = createSignal<File | null>(null);
  const [imagePreview, setImagePreview] = createSignal<string | null>(null);
  const { geo, setGeo, requestPosition } = useGeolocation();

  let imageInputRef!: HTMLInputElement;

  function clearImage() {
    const prev = imagePreview();
    if (prev) URL.revokeObjectURL(prev);
    setImagePreview(null);
    setImageFile(null);
    if (imageInputRef) imageInputRef.value = "";
  }

  async function handleImageSelect(file: File) {
    const prev = imagePreview();
    if (prev) URL.revokeObjectURL(prev);
    setImagePreview(URL.createObjectURL(file));
    setImageFile(await downscaleImage(file));
  }

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
      image: imageFile() ?? undefined,
    });
    setNote("");
    setLocation("");
    setSelectedListIds([]);
    setUserEdited(false);
    clearImage();
  }

  let locationRef!: HTMLInputElement;
  let geocodeAbort: AbortController | null = null;

  function cancelGeocode() {
    geocodeAbort?.abort();
    geocodeAbort = null;
    setReverseLoading(false);
  }

  onCleanup(() => {
    cancelGeocode();
    const prev = imagePreview();
    if (prev) URL.revokeObjectURL(prev);
  });

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
      clearImage();
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
    <TopSheet
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

        {/* Visually hidden (not display:none) so Safari still opens the file
            dialog when the associated label is clicked. */}
        <input
          ref={imageInputRef}
          id="quickadd-image-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: 0,
            overflow: "hidden",
            "pointer-events": "none",
          }}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) handleImageSelect(file);
          }}
        />
        <Show
          when={imagePreview()}
          fallback={
            <label for="quickadd-image-input" class={styles.imageBtn}>
              <Icon name="add_a_photo" size={20} />
              Lägg till bild
            </label>
          }
        >
          <div class={styles.imagePreview}>
            <img src={imagePreview()!} alt="Förhandsvisning" />
            <button
              type="button"
              class={styles.imageRemove}
              aria-label="Ta bort bild"
              onClick={clearImage}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </Show>

        <button class={styles.confirmBtn} onClick={handleConfirm}>
          Kryssa!
        </button>
      </div>
    </TopSheet>
  );
}
