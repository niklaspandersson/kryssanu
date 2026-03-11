import { Router, Route } from "@solidjs/router";
import { AuthProvider } from "./lib/auth";
import Home from "./pages/Home";
import BirdList from "./pages/BirdList";
import BirdDetail from "./pages/BirdDetail";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/list" component={BirdList} />
        <Route path="/bird/:id" component={BirdDetail} />
      </Router>
    </AuthProvider>
  );
}
