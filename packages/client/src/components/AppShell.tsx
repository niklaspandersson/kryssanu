import type { RouteSectionProps } from "@solidjs/router";
import BottomNav from "./BottomNav";
import styles from "./AppShell.module.css";

export default function AppShell(props: RouteSectionProps) {
  return (
    <div class={styles.shell}>
      <main class={styles.content}>{props.children}</main>
      <BottomNav />
    </div>
  );
}
