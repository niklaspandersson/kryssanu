import type {
  Bird,
  Observation,
  ObservedBirds,
  User,
  CreateObservationInput,
} from "@kryssanu/shared";

const BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────
export const auth = {
  me: () => fetchJson<User>("/auth/me"),
  loginWithGoogle: (credential: string) =>
    fetchJson<User>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  logout: () =>
    fetchJson<{ ok: boolean }>("/auth/logout", { method: "POST" }),
};

// ── Birds ───────────────────────────────────────────────────────────
export const birds = {
  getAll: () => fetchJson<Bird[]>("/birds"),
  getOne: (id: string) => fetchJson<Bird>(`/birds/${encodeURIComponent(id)}`),
};

// ── Observations ────────────────────────────────────────────────────
export const observations = {
  getObserved: () => fetchJson<ObservedBirds>("/observations/observed"),
  getForBird: (birdId: string) =>
    fetchJson<Observation[]>(
      `/observations/bird/${encodeURIComponent(birdId)}`
    ),
  create: (input: CreateObservationInput) =>
    fetchJson<Observation>("/observations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
