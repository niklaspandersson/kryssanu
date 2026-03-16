import { createSignal, onMount } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { events as eventsApi } from "../lib/api";
import EmptyState from "../components/EmptyState";

export default function InviteAcceptPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [error, setError] = createSignal(false);

  onMount(async () => {
    try {
      const { eventId } = await eventsApi.acceptInvite(params.token);
      navigate(`/events/${eventId}`, { replace: true });
    } catch {
      setError(true);
    }
  });

  return (
    <div style={{ padding: "var(--space-lg)" }}>
      {error() ? (
        <>
          <EmptyState icon="link_off" message="Inbjudningslänken är ogiltig eller har gått ut" />
          <div style={{ display: "flex", "justify-content": "center", "margin-top": "var(--space-lg)" }}>
            <A href="/events" style={{ color: "var(--color-primary)", "text-decoration": "none" }}>
              Tillbaka till events
            </A>
          </div>
        </>
      ) : (
        <EmptyState icon="hourglass_empty" message="Accepterar inbjudan..." />
      )}
    </div>
  );
}
