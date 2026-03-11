import type { JSX } from "solid-js";
import Icon from "./Icon";
import styles from "./IconHeader.module.css";

type Props = {
  icon: string | JSX.Element;
  children: JSX.Element;
};

export default function IconHeader(props: Props) {
  return (
    <header class={styles.iconHeader}>
      {typeof props.icon === "string" ? <Icon name={props.icon} /> : props.icon}
      <h2>{props.children}</h2>
    </header>
  );
}
