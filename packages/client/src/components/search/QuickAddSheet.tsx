import { createSignal, createEffect } from "solid-js";
import type { Bird, EventWithParticipants } from "@kryssanu/shared";
import BottomSheet from "../BottomSheet";
import styles from "./QuickAddSheet.module.css";

type Props = {
  bird: Bird | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { note?: string; location?: string; eventId?: string }) => void;
  activeEvents: EventWithParticipants[];
  preselectedEventId?: string;
};

export default function QuickAddSheet(props: Props) {
  const [note, setNote] = createSignal("");
  const [location, setLocation] = createSignal("");
  const [eventId, setEventId] = createSignal(props.preselectedEventId || "");

  function handleConfirm() {
    props.onConfirm({
      note: note() || undefined,
      location: location() || undefined,
      eventId: eventId() || undefined,
    });
    setNote("");
    setLocation("");
  }

  let locationRef!: HTMLInputElement;

  createEffect(() => {
    if (props.open) {
      requestAnimationFrame(() => locationRef?.focus());
    }
  });

  return (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      title={props.bird?.swedish ?? ""}
    >
      <div class={styles.form}>
        <input
          ref={locationRef}
          type="text"
          class={styles.input}
          placeholder="Plats (valfri)"
          value={location()}
          onInput={(e) => setLocation(e.currentTarget.value)}
        />
        <input
          type="text"
          class={styles.input}
          placeholder="Anteckning (valfri)"
          value={note()}
          onInput={(e) => setNote(e.currentTarget.value)}
        />
        {props.activeEvents.length > 0 && (
          <select
            class={styles.select}
            value={eventId()}
            onChange={(e) => setEventId(e.currentTarget.value)}
          >
            <option value="">Inget event</option>
            {props.activeEvents.map((ev) => (
              <option value={ev.id}>{ev.name}</option>
            ))}
          </select>
        )}
        <button class={styles.confirmBtn} onClick={handleConfirm}>
          Kryssa!
        </button>
      </div>
    </BottomSheet>
  );
}
