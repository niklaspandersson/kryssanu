import Icon from "../Icon";
import styles from "./Header.module.css";

type Props = {
  showMenu?: () => void;
};

export default function Header(props: Props) {
  return (
    <header class={styles.header}>
      <button class={styles.button} onClick={props.showMenu}>
        <Icon name="menu" />
      </button>
    </header>
  );
}
