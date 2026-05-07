import { Router, Route } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { Show, onMount, type JSX } from "solid-js";
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
import CreateListPage from "./pages/CreateListPage";
import ListDetailPage from "./pages/ListDetailPage";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import ProfilePage from "./pages/ProfilePage";
import BirdsPage from "./pages/BirdsPage";
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
  let loginRef!: HTMLDivElement;

  onMount(() => {
    if (isOnline()) {
      showOneTap();
      renderGoogleButton(loginRef);
    }
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
    </Show>
  );
}

function Protected(props: { children: JSX.Element }) {
  const { isLoggedIn, loading } = useAuth();

  return (
    <Show when={!loading() && isLoggedIn()} fallback={
      <Show when={!loading()}>
        <LoginFallback />
      </Show>
    }>
      {props.children}
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
      <Route path="/summary" component={protectedPage(SummaryPage)} />
      <Route path="/events" component={protectedPage(EventsPage)} />
      <Route path="/events/new" component={protectedPage(CreateEventPage)} />
      <Route path="/events/:id" component={protectedPage(EventDetailPage)} />
      <Route path="/lists" component={protectedPage(ListsPage)} />
      <Route path="/lists/new" component={protectedPage(CreateListPage)} />
      <Route path="/lists/:id" component={protectedPage(ListDetailPage)} />
      <Route path="/invite/:token" component={protectedPage(InviteAcceptPage)} />
      <Route path="/profile" component={protectedPage(ProfilePage)} />
      <Route path="/about" component={AboutPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/terms" component={TermsPage} />
    </Router>
  );
}
