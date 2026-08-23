import styles from "./SearchInput.module.css";

type Props = {
  value: string;
  onInput: (value: string) => void;
  ref?: HTMLInputElement | ((el: HTMLInputElement) => void);
};

export default function SearchInput(props: Props) {
  return (
    <div class={styles.wrapper} id="search-input-wrapper">
      <span class="md-icon">search</span>
      <input
        ref={props.ref}
        type="text"
        class={styles.input}
        placeholder="Sök efter fågel..."
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        autofocus
      />
      {props.value && (
        <button
          class={styles.clear}
          onClick={() => props.onInput("")}
          aria-label="Rensa sökning"
        >
          <span class="md-icon">close</span>
        </button>
      )}
    </div>
  );
}
