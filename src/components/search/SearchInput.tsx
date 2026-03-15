import styles from "./SearchInput.module.css";

type Props = {
  value: string;
  onInput: (value: string) => void;
};

export default function SearchInput(props: Props) {
  return (
    <div class={styles.wrapper}>
      <span class="md-icon">search</span>
      <input
        type="text"
        class={styles.input}
        placeholder="Sök efter fågel..."
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        autofocus
      />
      {props.value && (
        <button class={styles.clear} onClick={() => props.onInput("")}>
          <span class="md-icon">close</span>
        </button>
      )}
    </div>
  );
}
