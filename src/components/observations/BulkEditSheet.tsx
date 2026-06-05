import { createSignal, createMemo, Show, For } from "solid-js";
import type { ObservationWithBird, ListWithDetails } from "../../lib/types";
import TopSheet from "../TopSheet";
import Icon from "../Icon";
import styles from "./EditSheets.module.css";

export type BulkMode = "location" | "date" | "lists";

export type BulkApply =
  | { op: "setLocation"; value: string }
  | { op: "setDate"; value: string }
  | { op: "addList" | "removeList"; value: string };

type Props = {
  mode: BulkMode;
  count: number;
  lists: ListWithDetails[];
  /** Currently selected observations (reactive — drives the tri-state chips). */
  selectedObs: ObservationWithBird[];
  saving: boolean;
  onClose: () => void;
  onApply: (payload: BulkApply) => void;
};

function todayInput(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function BulkEditSheet(props: Props) {
  const [location, setLocation] = createSignal("");
  const [date, setDate] = createSignal(todayInput());

  const titles: Record<BulkMode, string> = {
    location: "Ange plats",
    date: "Ange datum",
    lists: "Koppla till listor",
  };

  // tri-state per list across the current selection
  const listState = createMemo(() => {
    const sel = props.selectedObs;
    const map: Record<string, "none" | "some" | "all"> = {};
    for (const l of props.lists) {
      const n = sel.filter((o) => (o.listIds ?? []).includes(l.id)).length;
      map[l.id] = n === 0 ? "none" : n === sel.length ? "all" : "some";
    }
    return map;
  });

  return (
    <TopSheet open={true} onClose={props.onClose}>
      <div class={styles.header}>
        <h3 class={styles.title}>{titles[props.mode]}</h3>
        <span class={styles.sub}>
          {props.mode === "lists"
            ? `${props.count} valda`
            : `för ${props.count} observationer`}
        </span>
      </div>

      <div class={styles.form}>
        <Show when={props.mode === "location"}>
          <label class={styles.formLabel}>
            Plats
            <input
              class={styles.formField}
              type="text"
              autofocus
              placeholder="t.ex. Lidhemssjön"
              value={location()}
              onInput={(e) => setLocation(e.currentTarget.value)}
            />
          </label>
        </Show>

        <Show when={props.mode === "date"}>
          <label class={styles.formLabel}>
            Datum
            <input
              class={styles.formField}
              type="date"
              max={todayInput()}
              value={date()}
              onInput={(e) => setDate(e.currentTarget.value)}
            />
          </label>
        </Show>

        <Show when={props.mode === "lists"}>
          <div class={styles.formLabel}>
            <span class={styles.hint}>
              Tryck för att lägga till alla · tryck igen för att ta bort
            </span>
            <div class={styles.listChips}>
              <For each={props.lists}>
                {(list) => {
                  const st = () => listState()[list.id];
                  return (
                    <button
                      type="button"
                      class={styles.listChip}
                      classList={{
                        [styles.listChipActive]: st() === "all",
                        [styles.listChipPartial]: st() === "some",
                      }}
                      onClick={() =>
                        props.onApply({
                          op: st() === "all" ? "removeList" : "addList",
                          value: list.id,
                        })
                      }
                    >
                      <Show when={st() === "all"}>
                        <Icon name="check" size={15} />
                      </Show>
                      <Show when={st() === "some"}>
                        <Icon name="remove" size={15} />
                      </Show>
                      {list.name}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        <Show when={props.mode !== "lists"}>
          <div class={styles.actions}>
            <button class={styles.btnGhost} onClick={props.onClose}>
              Avbryt
            </button>
            <button
              class={styles.btnPrimary}
              disabled={
                props.saving ||
                (props.mode === "location" && !location().trim())
              }
              onClick={() =>
                props.onApply(
                  props.mode === "location"
                    ? { op: "setLocation", value: location().trim() }
                    : { op: "setDate", value: date() }
                )
              }
            >
              {props.saving ? "Uppdaterar..." : `Uppdatera ${props.count}`}
            </button>
          </div>
        </Show>

        <Show when={props.mode === "lists"}>
          <div class={styles.actions}>
            <button class={styles.btnPrimary} onClick={props.onClose}>
              Klar
            </button>
          </div>
        </Show>
      </div>
    </TopSheet>
  );
}
