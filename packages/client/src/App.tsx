import { Router, Route } from "@solidjs/router";
import { AuthProvider } from "./lib/auth";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import FeedPage from "./pages/FeedPage";
import BirdDetailPage from "./pages/BirdDetailPage";
import StatsPage from "./pages/StatsPage";
import UserStatsPage from "./pages/UserStatsPage";
import EventsPage from "./pages/EventsPage";
import CreateEventPage from "./pages/CreateEventPage";
import EventDetailPage from "./pages/EventDetailPage";
import ProfilePage from "./pages/ProfilePage";
import MyBirdsPage from "./pages/MyBirdsPage";
import AboutPage from "./pages/AboutPage";
import HelpPage from "./pages/HelpPage";
import TermsPage from "./pages/TermsPage";

export default function App() {
  return (
    <AuthProvider>
      <Router root={AppShell}>
        <Route path="/" component={HomePage} />
        <Route path="/my-birds" component={MyBirdsPage} />
        <Route path="/feed" component={FeedPage} />
        <Route path="/bird/:id" component={BirdDetailPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/stats/:userId" component={UserStatsPage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/events/new" component={CreateEventPage} />
        <Route path="/events/:id" component={EventDetailPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/help" component={HelpPage} />
        <Route path="/terms" component={TermsPage} />
      </Router>
    </AuthProvider>
  );
}
