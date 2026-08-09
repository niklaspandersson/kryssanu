import { createEffect } from "solid-js";
import type { Bird } from "../../lib/types";
import TopSheet from "../TopSheet";
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
  onNavigate?: () => void;
  worldwide: boolean;
  worldwideLoading: boolean;
  onSearchWorldwide: () => void;
};

export default function SearchSheet(props: Props) {
  let inputRef!: HTMLInputElement;

  createEffect(() => {
    if (props.open) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  let scrollStartY = 0;

  return (
    <TopSheet
      open={props.open}
      onClose={props.onClose}
      sheetClass={styles.tallSheet}
    >
      <div class={styles.content} on:touchmove={{ handleEvent: (e) => {
        e.stopImmediatePropagation();

        const wrapper = document.getElementById("search-input-wrapper");
        let el = e.target as HTMLElement;
        while (el && el !== e.currentTarget) {
          el = el.parentElement as HTMLElement;
          if(el === wrapper) {
            e.preventDefault();
          }
        }
      }, passive: false }}>
        <SearchInput
          ref={inputRef}
          value={props.query}
          onInput={props.onQueryChange}
        />
        <div class={styles.resultsArea}
            onTouchStart={(e) => scrollStartY = e.touches[0].clientY}
            on:touchmove={ {
              handleEvent: (e) => {
                  const el = e.currentTarget;
                  const atTop = el.scrollTop <= 0;
                  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;

                  // If we're at a scroll boundary and trying to scroll further, block it
                  if ((atTop && e.touches[0].clientY > scrollStartY) ||
                      (atBottom && e.touches[0].clientY < scrollStartY)) {
                    e.preventDefault();
                  }
              },
              passive: false }
            }
        >
          <SearchResults
            query={props.query}
            filtered={props.filtered}
            observedBirds={props.observedBirds}
            onAdd={props.onAdd}
            onNavigate={props.onNavigate}
            worldwide={props.worldwide}
            worldwideLoading={props.worldwideLoading}
            onSearchWorldwide={props.onSearchWorldwide}
          />
        </div>
      </div>
    </TopSheet>
  );
}
