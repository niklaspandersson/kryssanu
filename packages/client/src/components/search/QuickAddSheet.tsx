import { createSignal, createEffect } from "solid-js";
import type { Bird } from "@kryssanu/shared";
import BottomSheet from "../BottomSheet";
import styles from "./QuickAddSheet.module.css";

type Props = {
  bird: Bird | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { note?: string; location?: string }) => void;
};

export default function QuickAddSheet(props: Props) {
  const [note, setNote] = createSignal("");
  const [location, setLocation] = createSignal("");

  function handleConfirm() {
    props.onConfirm({
      note: note() || undefined,
      location: location() || undefined,
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
        <button class={styles.confirmBtn} onClick={handleConfirm}>
          Kryssa!
        </button>
      </div>
    </BottomSheet>
  );
}
