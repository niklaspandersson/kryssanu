import { createSignal } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import Icon from "../components/Icon";
import styles from "./CreateEventPage.module.css";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [startsAt, setStartsAt] = createSignal("");
  const [endsAt, setEndsAt] = createSignal("");
  const [isPublic, setIsPublic] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!name() || !startsAt() || !endsAt()) return;

    setSubmitting(true);
    try {
      const event = await eventsApi.create({
        name: name(),
        description: description() || undefined,
        isPublic: isPublic() || undefined,
        startsAt: new Date(startsAt()).toISOString(),
        endsAt: new Date(endsAt()).toISOString(),
      });
      navigate(`/events/${event.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class={styles.page}>
      <A href="/events" class={styles.back}>
        <Icon name="arrow_back" size={18} />
        Tillbaka
      </A>
      <h1 class={styles.heading}>Skapa event</h1>

      <form class={styles.form} onSubmit={handleSubmit}>
        <label class={styles.label}>
          Namn *
          <input
            type="text"
            class={styles.input}
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            required
          />
        </label>
        <label class={styles.label}>
          Beskrivning
          <textarea
            class={styles.textarea}
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            rows={3}
          />
        </label>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isPublic()}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
          />
          Publikt event
          <span class={styles.checkboxHint}>Alla kan se och gå med i eventet</span>
        </label>
        <label class={styles.label}>
          Startar *
          <input
            type="datetime-local"
            class={styles.input}
            value={startsAt()}
            onInput={(e) => setStartsAt(e.currentTarget.value)}
            required
          />
        </label>
        <label class={styles.label}>
          Slutar *
          <input
            type="datetime-local"
            class={styles.input}
            value={endsAt()}
            onInput={(e) => setEndsAt(e.currentTarget.value)}
            required
          />
        </label>
        <button
          type="submit"
          class={styles.submitBtn}
          disabled={submitting() || !name() || !startsAt() || !endsAt()}
        >
          {submitting() ? "Skapar..." : "Skapa event"}
        </button>
      </form>
    </div>
  );
}
