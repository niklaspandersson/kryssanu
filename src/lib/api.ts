import type {
  Bird,
  Observation,
  ObservationWithBird,
  ObservedBirds,
  ChecklistData,
  User,
  UserStats,
  CreateObservationInput,
  CreateEventInput,
  EventWithParticipants,
  LeaderboardEntry,
  FeedItem,
  ParticipantWithUser,
  UpdateProfileInput,
  InviteTokenResponse,
} from './types';

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
  checklist: () => fetchJson<ChecklistData>('/observations/checklist'),
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
  join: (eventId: string) =>
    fetchJson<EventWithParticipants>(
      `/events/${encodeURIComponent(eventId)}/join`,
      { method: 'POST' }
    ),
  leaderboard: (eventId: string) =>
    fetchJson<LeaderboardEntry[]>(
      `/events/${encodeURIComponent(eventId)}/leaderboard`
    ),
  participantObservations: (eventId: string, userId: string) =>
    fetchJson<ObservationWithBird[]>(
      `/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(userId)}/observations`
    ),
  createInviteToken: (eventId: string) =>
    fetchJson<InviteTokenResponse>(
      `/events/${encodeURIComponent(eventId)}/invite-token`,
      { method: 'POST' }
    ),
  deleteInviteToken: (eventId: string) =>
    fetchJson<{ ok: boolean }>(
      `/events/${encodeURIComponent(eventId)}/invite-token`,
      { method: 'DELETE' }
    ),
  acceptInvite: (token: string) =>
    fetchJson<{ eventId: string }>(
      `/invite/${encodeURIComponent(token)}`,
      { method: 'POST' }
    ),
};

// ── Stats ───────────────────────────────────────────────────────────
export const stats = {
  me: () => fetchJson<UserStats>('/stats/me'),
  user: (userId: string) =>
    fetchJson<UserStats>(`/stats/user/${encodeURIComponent(userId)}`),
};

// ── Users ───────────────────────────────────────────────────────────
export const users = {
  getOne: (id: string) => fetchJson<User>(`/users/${encodeURIComponent(id)}`),
  updateProfile: (input: UpdateProfileInput) =>
    fetchJson<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

// ── Export ──────────────────────────────────────────────────────────
export const exportApi = {
  getAuthorizeUrl: () =>
    fetchJson<{ url: string }>('/export/google/authorize'),
  exportToSheets: () =>
    fetchJson<{ spreadsheetId: string; spreadsheetUrl: string }>(
      '/export/google/sheets',
      { method: 'POST' }
    ),
};

// ── Feed ────────────────────────────────────────────────────────────
export const feed = {
  get: (cursor?: string) =>
    fetchJson<{ items: FeedItem[]; nextCursor: string | null }>(
      `/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`
    ),
};
