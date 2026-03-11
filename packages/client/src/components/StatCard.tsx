import styles from "./StatCard.module.css";

type Props = {
  value: number;
  label: string;
  highlight?: boolean;
};

export default function StatCard(props: Props) {
  return (
    <div
      class={styles.card}
      classList={{ [styles.highlight]: props.highlight }}
    >
      <span class={styles.value}>{props.value}</span>
      <span class={styles.label}>{props.label}</span>
    </div>
  );
}
