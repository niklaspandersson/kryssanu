import { createSignal } from "solid-js";
import TopSheet from "../TopSheet";
import styles from "../observations/EditSheets.module.css";

type ListInput = { name: string; description: string | null };

type Props = {
  /** The list being edited, or undefined when creating a new one. */
  list?: { id: string; name: string; description: string | null };
  saving: boolean;
  onClose: () => void;
  onSave: (input: ListInput) => void;
};

export default function EditListSheet(props: Props) {
  const [name, setName] = createSignal(props.list?.name ?? "");
  const [description, setDescription] = createSignal(props.list?.description ?? "");

  const isEdit = () => !!props.list;

  function handleSave() {
    if (!name().trim()) return;
    props.onSave({
      name: name().trim(),
      description: description().trim() || null,
    });
  }

  return (
    <TopSheet open={true} onClose={props.onClose}>
      <div class={styles.header}>
        <h3 class={styles.title}>{isEdit() ? "Redigera lista" : "Skapa lista"}</h3>
      </div>

      <div class={styles.form}>
        <label class={styles.formLabel}>
          Namn
          <input
            class={styles.formField}
            type="text"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            maxlength={100}
            required
          />
        </label>

        <label class={styles.formLabel}>
          Beskrivning
          <textarea
            class={styles.formField}
            placeholder="Beskrivning (valfri)"
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            maxlength={500}
          />
        </label>

        <div class={styles.actions}>
          <button class={styles.btnGhost} onClick={props.onClose}>
            Avbryt
          </button>
          <button
            class={styles.btnPrimary}
            disabled={props.saving || !name().trim()}
            onClick={handleSave}
          >
            {props.saving
              ? "Sparar..."
              : isEdit()
                ? "Spara ändringar"
                : "Skapa lista"}
          </button>
        </div>
      </div>
    </TopSheet>
  );
}
