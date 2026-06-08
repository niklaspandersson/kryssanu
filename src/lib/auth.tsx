import {
  createContext,
  useContext,
  createSignal,
  onMount,
  type JSX,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import type { User } from "./types";
import { auth, me, setUnauthorizedHandler } from "./api";
import { apiCache } from "./offlineDb";

type AuthContextValue = {
  user: () => User | null;
  loading: () => boolean;
  isLoggedIn: () => boolean;
  showOneTap: (onLogin?: () => void) => void;
  renderGoogleButton: (container: HTMLElement) => void;
  signOut: () => Promise<void>;
  updateUser: (updated: User) => void;
};

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: { children: JSX.Element }) {
  const [user, setUser] = createSignal<User | null>(null);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();
  let googleInitialized = false;
  let pendingLoginCallback: (() => void) | undefined;

  function handleCredentialResponse(response: { credential: string }) {
    auth
      .loginWithGoogle(response.credential)
      .then((u) => {
        setUser(u);
        const cb = pendingLoginCallback;
        pendingLoginCallback = undefined;
        if (cb) {
          cb();
        } else {
          navigate("/summary");
        }
      })
      .catch(console.error);
  }

  function initGoogle() {
    const google = (window as any).google;
    if (!google || googleInitialized) return;

    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });
    googleInitialized = true;
  }

  onMount(async () => {
    setUnauthorizedHandler(() => {
      if (user() === null) return;
      setUser(null);
      localStorage.removeItem("kryssanu-user");
      apiCache.clear().finally(() => { window.location.href = "/"; });
    });

    try {
      const u = await me.get();
      setUser(u);
      localStorage.setItem("kryssanu-user", JSON.stringify(u));
    } catch {
      // Offline or not logged in — try localStorage
      const cached = localStorage.getItem("kryssanu-user");
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          // Invalid cached data
        }
      }
    } finally {
      setLoading(false);
    }
    initGoogle();
  });

  function showOneTap(onLogin?: () => void) {
    if (loading()) return;
    pendingLoginCallback = onLogin;
    initGoogle();
    const google = (window as any).google;
    if (!google) return;
    google.accounts.id.prompt();
  }

  function renderGoogleButton(container: HTMLElement) {
    const ready = (window as any).__googleGsiReady as Promise<void> | undefined;
    if (!ready) return;
    ready.then(() => {
      initGoogle();
      const google = (window as any).google;
      if (!google) return;
      google.accounts.id.renderButton(container, {
        type: "standard",
        size: "medium",
        text: "signin_with",
        locale: "sv",
      });
    });
  }

  async function signOut() {
    localStorage.removeItem("kryssanu-user");
    await apiCache.clear();
    await auth.logout();
    window.location.href = "/";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: () => user() !== null,
        showOneTap,
        renderGoogleButton,
        signOut,
        updateUser: (updated: User) => setUser(updated),
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
