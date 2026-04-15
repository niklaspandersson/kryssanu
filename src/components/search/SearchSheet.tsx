import { createEffect } from "solid-js";
import type { Bird } from "../../lib/types";
import BottomSheet from "../BottomSheet";
import SearchInput from "./SearchInput";
import SearchResults from "../SearchResults";
import styles from "./SearchSheet.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  filtered: Bird[];
  observedBirds: Record<number, boolean>;
  onAdd: (bird: Bird) => void;
};

export default function SearchSheet(props: Props) {
  let inputRef!: HTMLInputElement;

  createEffect(() => {
    if (props.open) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  return (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      sheetClass={styles.tallSheet}
    >
      <div class={styles.content}>
        <div class={styles.resultsArea}>
          <SearchResults
            query={props.query}
            filtered={props.filtered}
            observedBirds={props.observedBirds}
            onAdd={props.onAdd}
          />
        </div>
        <SearchInput
          ref={inputRef}
          value={props.query}
          onInput={props.onQueryChange}
        />
      </div>
    </BottomSheet>
  );
}
