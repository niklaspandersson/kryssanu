import type {
  Observation,
  ObservationWithBird,
  ObservedBirds,
  ChecklistData,
  User,
  UserStats,
  CreateObservationInput,
  UpdateObservationInput,
  BulkObservationPayload,
  CreateEventInput,
  EventWithDetails,
  LeaderboardEntry,
  FeedItem,
  ParticipantWithUser,
  UpdateProfileInput,
  InviteTokenResponse,
  PaginatedObservations,
  Memberships,
  ListWithDetails,
  CreateListInput,
  UpdateListInput,
} from './types';
import { apiCache } from './offlineDb';
import { isOnline } from './useOnlineStatus';

const BASE = '/api';

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method === 'GET';

  if (isGet && !isOnline()) {
    const cached = await apiCache.get<T>(url);
    if (cached) return cached.data;
    throw new Error('Offline och ingen cachad data tillgänglig');
  }

  try {
    const res = await fetch(`${BASE}${url}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) {
      if (res.status === 401) unauthorizedHandler?.();
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.json() as T;
    if (isGet) {
      apiCache.set(url, data).catch(() => {});
    }
    return data;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('401')) throw e;
    if (isGet) {
      const cached = await apiCache.get<T>(url);
      if (cached) return cached.data;
    }
    throw e;
  }
}

// ── Auth ────────────────────────────────────────────────────────────
export const auth = {
  loginWithGoogle: (credential: string) =>
    fetchJson<User>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),
  logout: () => fetchJson<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
};

// ── Me (current user) ──────────────────────────────────────────────
export const me = {
  get: () => fetchJson<User>('/me'),
  update: (input: UpdateProfileInput) =>
    fetchJson<User>('/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  stats: () => fetchJson<UserStats>('/me/stats'),
  checklist: () => fetchJson<ChecklistData>('/me/checklist'),
  observed: () => fetchJson<ObservedBirds>('/me/observed'),
  observations: (opts: { limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.offset != null) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return fetchJson<ObservationWithBird[]>(`/me/observations${qs ? `?${qs}` : ''}`);
  },
  allObservations: (opts: { limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.offset != null) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return fetchJson<PaginatedObservations>(`/me/observations/all${qs ? `?${qs}` : ''}`);
  },
  observationsForBird: (birdId: string) =>
    fetchJson<Observation[]>(
      `/me/observations/bird/${encodeURIComponent(birdId)}`
    ),
  createObservation: (input: CreateObservationInput) =>
    fetchJson<Observation>('/me/observations', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateObservation: (id: string, input: UpdateObservationInput) =>
    fetchJson<ObservationWithBird>(
      `/me/observations/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    ),
  deleteObservation: (id: string) =>
    fetchJson<{ ok: boolean }>(
      `/me/observations/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
  bulkObservations: (payload: BulkObservationPayload) =>
    fetchJson<{ ok: boolean; count: number }>('/me/observations/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  memberships: () => fetchJson<Memberships>('/me/memberships'),
};

// ── Lists ───────────────────────────────────────────────────────────
export const lists = {
  getAll: () => fetchJson<ListWithDetails[]>('/me/lists'),
  getOne: (id: string) =>
    fetchJson<ListWithDetails>(`/lists/${encodeURIComponent(id)}`),
  create: (input: CreateListInput) =>
    fetchJson<ListWithDetails>('/lists', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateListInput) =>
    fetchJson<ListWithDetails>(`/lists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    fetchJson<{ ok: boolean }>(`/lists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  observations: (id: string) =>
    fetchJson<ObservationWithBird[]>(
      `/lists/${encodeURIComponent(id)}/observations`
    ),
  addObservation: (id: string, observationId: string) =>
    fetchJson<{ ok: boolean }>(
      `/lists/${encodeURIComponent(id)}/observations`,
      { method: 'POST', body: JSON.stringify({ observationId }) }
    ),
  removeObservation: (id: string, observationId: string) =>
    fetchJson<{ ok: boolean }>(
      `/lists/${encodeURIComponent(id)}/observations/${encodeURIComponent(observationId)}`,
      { method: 'DELETE' }
    ),
};

// ── Events ──────────────────────────────────────────────────────────
export const events = {
  getAll: (status?: string) =>
    fetchJson<EventWithDetails[]>(
      `/events${status ? `?status=${status}` : ''}`
    ),
  getOne: (id: string) =>
    fetchJson<EventWithDetails>(`/events/${encodeURIComponent(id)}`),
  create: (input: CreateEventInput) =>
    fetchJson<EventWithDetails>('/events', {
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
      { method: 'PATCH', body: JSON.stringify({ status }) }
    ),
  join: (eventId: string) =>
    fetchJson<EventWithDetails>(
      `/events/${encodeURIComponent(eventId)}/join`,
      { method: 'PUT' }
    ),
  leaderboard: (eventId: string) =>
    fetchJson<LeaderboardEntry[]>(
      `/events/${encodeURIComponent(eventId)}/leaderboard`
    ),
  participants: (eventId: string, opts: { limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.offset != null) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return fetchJson<ParticipantWithUser[]>(
      `/events/${encodeURIComponent(eventId)}/participants${qs ? `?${qs}` : ''}`
    );
  },
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
    fetchJson<{ eventId: string }>(`/invite/${encodeURIComponent(token)}`, {
      method: 'POST',
    }),
};

// ── Stats ───────────────────────────────────────────────────────────
export const stats = {
  user: (userId: string) =>
    fetchJson<UserStats>(`/stats/user/${encodeURIComponent(userId)}`),
};

// ── Export ──────────────────────────────────────────────────────────
export const exportApi = {
  getAuthorizeUrl: () => fetchJson<{ url: string }>('/export/google/authorize'),
  exportToSheets: () =>
    fetchJson<{ spreadsheetId: string; spreadsheetUrl: string }>(
      '/export/google/sheets',
      { method: 'POST' }
    ),
};

// ── Feed ────────────────────────────────────────────────────────────
export const feed = {
  get: (opts: { limit?: number; cursor?: string; eventId?: string } = {}) => {
    const { limit = 10, cursor, eventId } = opts;
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    if (eventId) params.set('eventId', eventId);
    return fetchJson<{ items: FeedItem[]; nextCursor: string | null }>(`/me/feed?${params}`);
  },
};
