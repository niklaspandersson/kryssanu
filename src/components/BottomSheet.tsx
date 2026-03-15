import { Show, type JSX } from "solid-js";
import styles from "./BottomSheet.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
};

export default function BottomSheet(props: Props) {
  return (
    <Show when={props.open}>
      <div class={styles.overlay} onClick={props.onClose}>
        <div class={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <div class={styles.handle} />
          <Show when={props.title}>
            <h3 class={styles.title}>{props.title}</h3>
          </Show>
          <div class={styles.body}>{props.children}</div>
        </div>
      </div>
    </Show>
  );
}
