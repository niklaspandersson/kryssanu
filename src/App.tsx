import { Router, Route } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { Show, createSignal, onMount, type JSX } from "solid-js";
import { AuthProvider, useAuth } from "./lib/auth";
import { isOnline } from "./lib/useOnlineStatus";
import EmptyState from "./components/EmptyState";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import SummaryPage from "./pages/SummaryPage";
import EventsPage from "./pages/EventsPage";
import CreateEventPage from "./pages/CreateEventPage";
import EventDetailPage from "./pages/EventDetailPage";
import ListsPage from "./pages/ListsPage";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import ProfilePage from "./pages/ProfilePage";
import BirdsPage from "./pages/BirdsPage";
import BirdDetailPage from "./pages/BirdDetailPage";
import ObservationsPage from "./pages/ObservationsPage";
import AboutPage from "./pages/AboutPage";
import HelpPage from "./pages/HelpPage";
import TermsPage from "./pages/TermsPage";

function RootLayout(props: RouteSectionProps) {
  return (
    <AuthProvider>
      <AppShell {...props} />
    </AuthProvider>
  );
}

function LoginFallback() {
  const { showOneTap, renderGoogleButton } = useAuth();
  const [buttonFailed, setButtonFailed] = createSignal(false);
  let loginRef!: HTMLDivElement;

  onMount(() => {
    if (!isOnline()) return;
    showOneTap();
    renderGoogleButton(loginRef).then((rendered) => setButtonFailed(!rendered));
  });

  return (
    <Show
      when={isOnline()}
      fallback={<EmptyState icon="cloud_off" message="Du måste vara online för att logga in" />}
    >
      <EmptyState icon="login" message="Logga in för att fortsätta" />
      <div style={{ display: "flex", "justify-content": "center", "margin-top": "1rem" }}>
        <div ref={loginRef} />
      </div>
      <Show when={buttonFailed()}>
        <EmptyState
          icon="cloud_off"
          message="Inloggningen kunde inte laddas. Kontrollera din anslutning och försök igen."
        />
      </Show>
    </Show>
  );
}

function Protected(props: { children: JSX.Element }) {
  const { isLoggedIn, loading } = useAuth();

  // Both branches render something. Rendering null while loading meant a single
  // request that never answered blanked the page with no explanation, which is
  // indistinguishable from a broken app.
  return (
    <Show when={!loading()} fallback={<EmptyState icon="hourglass_empty" message="Laddar..." />}>
      <Show when={isLoggedIn()} fallback={<LoginFallback />}>
        {props.children}
      </Show>
    </Show>
  );
}

function protectedPage(Component: () => JSX.Element) {
  return () => (
    <Protected>
      <Component />
    </Protected>
  );
}

export default function App() {
  return (
    <Router root={RootLayout}>
      <Route path="/" component={HomePage} />
      <Route path="/birds" component={protectedPage(BirdsPage)} />
      <Route path="/birds/:id" component={BirdDetailPage} />
      <Route path="/observations" component={protectedPage(ObservationsPage)} />
      <Route path="/observations/list/:listId" component={protectedPage(ObservationsPage)} />
      <Route path="/observations/bird/:birdId" component={protectedPage(ObservationsPage)} />
      <Route path="/summary" component={protectedPage(SummaryPage)} />
      <Route path="/events" component={protectedPage(EventsPage)} />
      <Route path="/events/new" component={protectedPage(CreateEventPage)} />
      <Route path="/events/:id" component={protectedPage(EventDetailPage)} />
      <Route path="/lists" component={protectedPage(ListsPage)} />
      <Route path="/invite/:token" component={protectedPage(InviteAcceptPage)} />
      <Route path="/profile" component={protectedPage(ProfilePage)} />
      <Route path="/about" component={AboutPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/terms" component={TermsPage} />
    </Router>
  );
}
