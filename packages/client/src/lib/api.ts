import type {
  Bird,
  Observation,
  ObservationWithBird,
  ObservedBirds,
  User,
  UserStats,
  StatsComparison,
  CreateObservationInput,
  CreateEventInput,
  EventWithParticipants,
  LeaderboardEntry,
  FeedItem,
  ParticipantWithUser,
} from '@kryssanu/shared';

const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────
export const auth = {
  me: () => fetchJson<User>('/auth/me'),
  loginWithGoogle: (credential: string) =>
    fetchJson<User>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),
  logout: () => fetchJson<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
};

// ── Birds ───────────────────────────────────────────────────────────
export const birds = {
  getAll: () => fetchJson<Bird[]>('/birds'),
  getOne: (id: string) => fetchJson<Bird>(`/birds/${encodeURIComponent(id)}`),
};

// ── Observations ────────────────────────────────────────────────────
export const observations = {
  getObserved: () => fetchJson<ObservedBirds>('/observations/observed'),
  getForBird: (birdId: string) =>
    fetchJson<Observation[]>(
      `/observations/bird/${encodeURIComponent(birdId)}`
    ),
  latest: () => fetchJson<ObservationWithBird[]>('/observations/latest'),
  create: (input: CreateObservationInput) =>
    fetchJson<Observation>('/observations', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

// ── Events ──────────────────────────────────────────────────────────
export const events = {
  getAll: (status?: string) =>
    fetchJson<EventWithParticipants[]>(
      `/events${status ? `?status=${status}` : ''}`
    ),
  getOne: (id: string) =>
    fetchJson<EventWithParticipants>(`/events/${encodeURIComponent(id)}`),
  create: (input: CreateEventInput) =>
    fetchJson<EventWithParticipants>('/events', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  invite: (eventId: string, email: string) =>
    fetchJson<ParticipantWithUser>(
      `/events/${encodeURIComponent(eventId)}/invite`,
      { method: 'POST', body: JSON.stringify({ email }) }
    ),
  respond: (eventId: string, status: 'ACCEPTED' | 'DECLINED') =>
    fetchJson<{ status: string }>(
      `/events/${encodeURIComponent(eventId)}/respond`,
      { method: 'POST', body: JSON.stringify({ status }) }
    ),
  leaderboard: (eventId: string) =>
    fetchJson<LeaderboardEntry[]>(
      `/events/${encodeURIComponent(eventId)}/leaderboard`
    ),
};

// ── Stats ───────────────────────────────────────────────────────────
export const stats = {
  me: () => fetchJson<UserStats>('/stats/me'),
  user: (userId: string) =>
    fetchJson<UserStats>(`/stats/user/${encodeURIComponent(userId)}`),
  compare: (userId: string) =>
    fetchJson<StatsComparison>(`/stats/compare/${encodeURIComponent(userId)}`),
};

// ── Users ───────────────────────────────────────────────────────────
export const users = {
  search: (q: string) =>
    fetchJson<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
  getOne: (id: string) => fetchJson<User>(`/users/${encodeURIComponent(id)}`),
};

// ── Feed ────────────────────────────────────────────────────────────
export const feed = {
  get: (cursor?: string) =>
    fetchJson<{ items: FeedItem[]; nextCursor: string | null }>(
      `/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`
    ),
};
