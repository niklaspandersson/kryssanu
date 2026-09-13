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
  renderGoogleButton: (container: HTMLElement) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUser: (updated: User) => void;
};

const AuthContext = createContext<AuthContextValue>();

const CACHED_USER_KEY = "kryssanu-user";

/**
 * The GSI script is loaded from accounts.google.com and is not cached by the
 * service worker. On a stalled connection its load promise never settles, so
 * awaiting it forever leaves an empty box where the sign-in button should be.
 */
const GSI_TIMEOUT_MS = 8_000;

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider(props: { children: JSX.Element }) {
  // Seeded synchronously from the last successful /me. A returning user's
  // session is already known, so the app can render its cached content at once
  // and revalidate in the background. Blocking on the network here is what left
  // the entire page blank on a connection that never answered.
  const cachedUser = readCachedUser();
  const [user, setUser] = createSignal<User | null>(cachedUser);
  const [loading, setLoading] = createSignal(cachedUser === null);
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
      localStorage.removeItem(CACHED_USER_KEY);
      apiCache.clear().finally(() => { window.location.href = "/"; });
    });

    try {
      const u = await me.get();
      setUser(u);
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
    } catch {
      // Offline, timed out, or signed out. Any cached user is already rendering;
      // an expired session is handled by the 401 handler above.
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

  /** Resolves false when the button could not be rendered, so the caller can
   *  say so rather than showing an empty space forever. */
  async function renderGoogleButton(container: HTMLElement): Promise<boolean> {
    const ready = (window as any).__googleGsiReady as Promise<void> | undefined;
    if (!ready) return false;

    const loaded = await Promise.race([
      ready.then(() => true),
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), GSI_TIMEOUT_MS)
      ),
    ]);
    if (!loaded) return false;

    initGoogle();
    const google = (window as any).google;
    if (!google) return false;
    google.accounts.id.renderButton(container, {
      type: "standard",
      size: "medium",
      text: "signin_with",
      locale: "sv",
    });
    return true;
  }

  async function signOut() {
    localStorage.removeItem(CACHED_USER_KEY);
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
