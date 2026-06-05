import { createSignal, Show, For } from "solid-js";
import type {
  ObservationWithBird,
  ListWithDetails,
  UpdateObservationInput,
} from "../../lib/types";
import TopSheet from "../TopSheet";
import Icon from "../Icon";
import styles from "./EditSheets.module.css";

type Props = {
  obs: ObservationWithBird;
  lists: ListWithDetails[];
  saving: boolean;
  onClose: () => void;
  onSave: (input: UpdateObservationInput) => void;
  onDelete: () => void;
};

/** ISO datetime → yyyy-mm-dd in local time, for a native date input. */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EditObservationSheet(props: Props) {
  const [date, setDate] = createSignal(toDateInput(props.obs.date));
  const [location, setLocation] = createSignal(props.obs.location ?? "");
  const [note, setNote] = createSignal(props.obs.note ?? "");
  const [listIds, setListIds] = createSignal<string[]>(props.obs.listIds ?? []);

  const toggleList = (id: string) =>
    setListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  function handleSave() {
    props.onSave({
      date: date(),
      location: location().trim() || null,
      note: note().trim() || null,
      listIds: listIds(),
    });
  }

  return (
    <TopSheet open={true} onClose={props.onClose}>
      <div class={styles.header}>
        <h3 class={styles.title}>{props.obs.bird.swedish}</h3>
        <span class={styles.sub}>{props.obs.bird.family}</span>
      </div>

      <div class={styles.form}>
        <label class={styles.formLabel}>
          Datum
          <input
            class={styles.formField}
            type="date"
            max={toDateInput(new Date().toISOString())}
            value={date()}
            onInput={(e) => setDate(e.currentTarget.value)}
          />
        </label>

        <label class={styles.formLabel}>
          Plats
          <input
            class={styles.formField}
            type="text"
            placeholder="Plats (valfri)"
            value={location()}
            onInput={(e) => setLocation(e.currentTarget.value)}
          />
        </label>

        <label class={styles.formLabel}>
          Anteckning
          <textarea
            class={styles.formField}
            placeholder="Anteckning (valfri)"
            value={note()}
            onInput={(e) => setNote(e.currentTarget.value)}
          />
        </label>

        <Show when={props.lists.length > 0}>
          <div class={styles.formLabel}>
            Listor
            <div class={styles.listChips}>
              <For each={props.lists}>
                {(list) => (
                  <button
                    type="button"
                    class={styles.listChip}
                    classList={{
                      [styles.listChipActive]: listIds().includes(list.id),
                    }}
                    onClick={() => toggleList(list.id)}
                  >
                    <Show when={listIds().includes(list.id)}>
                      <Icon name="check" size={15} />
                    </Show>
                    {list.name}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        <div class={styles.actions}>
          <button class={styles.btnGhost} onClick={props.onClose}>
            Avbryt
          </button>
          <button
            class={styles.btnPrimary}
            disabled={props.saving}
            onClick={handleSave}
          >
            {props.saving ? "Sparar..." : "Spara ändringar"}
          </button>
        </div>

        <div class={styles.deleteZone}>
          <button class={styles.btnDangerGhost} onClick={props.onDelete}>
            <Icon name="delete" size={18} />
            Ta bort observation
          </button>
        </div>
      </div>
    </TopSheet>
  );
}
