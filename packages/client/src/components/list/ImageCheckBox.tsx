import Icon from "../Icon";
import styles from "./ImageCheckBox.module.css";

type Props = {
  observed: boolean;
  onClick: () => void;
};

export default function ImageCheckBox(props: Props) {
  return (
    <div
      onClick={props.onClick}
      class={`${styles.container} ${props.observed ? styles.observed : ""}`}
      style={{ "background-image": "url(/bird-icon.png)" }}
    >
      <Icon name={props.observed ? "done" : "done_outline"} />
    </div>
  );
}
