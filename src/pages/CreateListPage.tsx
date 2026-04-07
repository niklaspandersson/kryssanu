import { createSignal, Show } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { lists as listsApi } from "../lib/api";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import styles from "./CreateListPage.module.css";

export default function CreateListPage() {
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!name()) return;

    setSubmitting(true);
    try {
      const list = await listsApi.create({
        name: name(),
        description: description() || undefined,
      });
      navigate(`/lists/${list.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class={styles.page}>
      <A href="/lists" class={styles.back}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </A>
      <h1 class={styles.heading}>Skapa lista</h1>

      <Show when={!isOnline()}>
        <div class={styles.offlineNotice}>
          <Icon name="cloud_off" size={20} />
          Du måste vara online för att skapa listor.
        </div>
      </Show>

      <form class={styles.form} onSubmit={handleSubmit}>
        <label class={styles.label}>
          Namn *
          <input
            type="text"
            class={styles.input}
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            maxlength={100}
            required
          />
        </label>
        <label class={styles.label}>
          Beskrivning
          <textarea
            class={styles.textarea}
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            maxlength={500}
            rows={3}
          />
        </label>
        <button
          type="submit"
          class={styles.submitBtn}
          disabled={submitting() || !isOnline() || !name()}
        >
          {submitting() ? "Skapar..." : "Skapa lista"}
        </button>
      </form>
    </div>
  );
}
