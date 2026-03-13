import {
  createContext,
  useContext,
  createSignal,
  onMount,
  type JSX,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import type { User } from "@kryssanu/shared";
import { auth } from "./api";

type AuthContextValue = {
  user: () => User | null;
  loading: () => boolean;
  isLoggedIn: () => boolean;
  requestLogin: () => void;
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

  function requestLogin() {
    initGoogle();
    const google = (window as any).google;
    if (!google) return;
    google.accounts.id.prompt((notification: any) => {
      // If One Tap is suppressed (cooldown after dismiss), fall back to button popup
      if (
        notification.isNotDisplayed() ||
        notification.isSkippedMoment()
      ) {
        openGoogleSignInPopup(google);
      }
    });
  }

  function openGoogleSignInPopup(google: any) {
    // Create a temporary hidden container, render Google button, and click it
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
    google.accounts.id.renderButton(container, {
      type: "standard",
      size: "large",
    });
    // The rendered button is an iframe; find and click it after a short delay
    requestAnimationFrame(() => {
      const btn =
        container.querySelector<HTMLElement>("div[role=button]") ??
        container.firstElementChild as HTMLElement | null;
      btn?.click();
      setTimeout(() => container.remove(), 5000);
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
        requestLogin,
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
