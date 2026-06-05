import { createEffect, onCleanup, Show, type JSX } from "solid-js";
import styles from "./TopSheet.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  sheetClass?: string;
  children: JSX.Element;
};

export default function TopSheet(props: Props) {
  createEffect(() => {
    if (props.open) {
      document.body.classList.add("overlay-open");
      onCleanup(() => {
        document.body.classList.remove("overlay-open");
      });
    }
  });

  let downOnOverlay = false;
  return (
    <Show when={props.open}>
      <div
        class={styles.overlay}
        onPointerDown={(e) => {
          downOnOverlay = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (downOnOverlay && e.target === e.currentTarget) props.onClose();
          downOnOverlay = false;
        }}
        on:touchmove={ { handleEvent: (e) => {
          e.preventDefault();
        }, passive: false } }
      >
        <div class={styles.sheet} classList={{ [props.sheetClass!]: !!props.sheetClass }}>
          <Show when={props.title}>
            <h3 class={styles.title}>{props.title}</h3>
          </Show>
          <div class={styles.body}>{props.children}</div>
          <div class={styles.handle} />
        </div>
      </div>
    </Show>
  );
}
