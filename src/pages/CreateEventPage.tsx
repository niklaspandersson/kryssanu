import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import { isOnline } from "../lib/useOnlineStatus";
import Icon from "../components/Icon";
import shared from "../styles/shared.module.css";
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
    <div class={shared.page}>
      <h1 class={shared.headingXl}>Skapa event</h1>

      <Show when={!isOnline()}>
        <div class={shared.offlineNotice}>
          <Icon name="cloud_off" size={20} />
          Du måste vara online för att skapa event.
        </div>
      </Show>

      <form class={shared.form} onSubmit={handleSubmit}>
        <label class={shared.formLabel}>
          Namn *
          <input
            type="text"
            class={shared.formInput}
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            required
          />
        </label>
        <label class={shared.formLabel}>
          Beskrivning
          <textarea
            class={shared.formTextarea}
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
        <label class={shared.formLabel}>
          Startar *
          <input
            type="datetime-local"
            class={shared.formInput}
            value={startsAt()}
            onInput={(e) => setStartsAt(e.currentTarget.value)}
            required
          />
        </label>
        <label class={shared.formLabel}>
          Slutar *
          <input
            type="datetime-local"
            class={shared.formInput}
            value={endsAt()}
            onInput={(e) => setEndsAt(e.currentTarget.value)}
            required
          />
        </label>
        <button
          type="submit"
          class={shared.submitBtn}
          disabled={submitting() || !isOnline() || !name() || !startsAt() || !endsAt()}
        >
          {submitting() ? "Skapar..." : "Skapa event"}
        </button>
      </form>
    </div>
  );
}
