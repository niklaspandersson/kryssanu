import { Show } from "solid-js";
import Icon from "./Icon";
import styles from "./Toast.module.css";

type Props = {
  message: string | null;
};

export default function Toast(props: Props) {
  return (
    <Show when={props.message}>
      {(msg) => (
        <div class={styles.toast} role="status">
          <Icon name="check_circle" size={18} />
          <span>{msg()}</span>
        </div>
      )}
    </Show>
  );
}
