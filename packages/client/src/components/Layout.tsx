import type { JSX } from "solid-js";
import styles from "./Layout.module.css";

export default function Layout(props: { children: JSX.Element }) {
  return (
    <main class={styles.main}>
      <div class={styles.container}>{props.children}</div>
    </main>
  );
}
