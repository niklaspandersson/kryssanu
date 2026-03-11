import styles from "./Badge.module.css";

type Props = {
  count: number;
};

export default function Badge(props: Props) {
  return (
    <span class={styles.badge} classList={{ [styles.hidden]: props.count <= 0 }}>
      {props.count > 99 ? "99+" : props.count}
    </span>
  );
}
