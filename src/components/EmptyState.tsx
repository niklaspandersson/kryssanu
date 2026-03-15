import Icon from "./Icon";
import styles from "./EmptyState.module.css";

type Props = {
  icon: string;
  message: string;
};

export default function EmptyState(props: Props) {
  return (
    <div class={styles.empty}>
      <Icon name={props.icon} size={48} />
      <p>{props.message}</p>
    </div>
  );
}
