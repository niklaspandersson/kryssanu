import {
  createContext,
  useContext,
  createSignal,
  onMount,
  type JSX,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import type { User } from "./types";
import { auth } from "./api";

type AuthContextValue = {
  user: () => User | null;
  loading: () => boolean;
  isLoggedIn: () => boolean;
  showOneTap: () => void;
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

  function handleCredentialResponse(response: { credential: string }) {
    auth
      .loginWithGoogle(response.credential)
      .then((u) => {
        setUser(u);
        navigate("/feed");
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
    try {
      const me = await auth.me();
      setUser(me);
    } catch {
      // Not logged in
    } finally {
      setLoading(false);
    }
    initGoogle();
  });

  function showOneTap() {
    if (loading()) return;
    initGoogle();
    const google = (window as any).google;
    if (!google) return;
    google.accounts.id.prompt();
  }

  function renderGoogleButton(container: HTMLElement) {
    initGoogle();
    const google = (window as any).google;
    if (!google) return;
    google.accounts.id.renderButton(container, {
      type: "standard",
      size: "large",
    });
  }

  async function signOut() {
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
