// ── Bird ────────────────────────────────────────────────────────────
export type Bird = {
  id: string;
  swedish: string;
  family: string;
  visitor: boolean;
};

// ── Observation ─────────────────────────────────────────────────────
export type Observation = {
  id: string;
  date: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  birdId: string;
  userId: string;
};

export type ObservationWithBird = Observation & {
  bird: Bird;
};

export type CreateObservationInput = {
  birdId: string;
  note?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  listIds?: string[];
};

// ── User (public-facing) ───────────────────────────────────────────
export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  city: string | null;
  about: string | null;
};

export type UpdateProfileInput = {
  city?: string;
  about?: string;
};

// ── Observed birds map ──────────────────────────────────────────────
export type ObservedBirds = Record<string, boolean>;

// ── Checklist ───────────────────────────────────────────────────────
export type ChecklistData = {
  observed: Record<string, string[]>;
};

// ── Event ───────────────────────────────────────────────────────────
export type CreateEventInput = {
  name: string;
  description?: string;
  isPublic?: boolean;
  startsAt: string;
  endsAt: string;
};

export type Event = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  creatorId: string;
};

// ── Participant ─────────────────────────────────────────────────────
export type ParticipantStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED';

export type ParticipantWithUser = {
  user: User;
  status: ParticipantStatus;
};

export type EventWithDetails = Event & {
  creator: User;
  participantCount: number;
  observationCount: number;
};

/** @deprecated Use EventWithDetails */
export type EventWithParticipants = EventWithDetails;

// ── Memberships ─────────────────────────────────────────────────────
export type Memberships = Record<string, ParticipantStatus>;

// ── User Stats ────────────────────────────────────────────────────
export type UserStats = {
  uniqueSpeciesLifetime: number;
  uniqueSpeciesThisYear: number;
  totalObservations: number;
  observationsThisWeek: number;
  observationsThisMonth: number;
  latestObservation: string | null;
  topFamilies: { family: string; count: number }[];
};

// ── Leaderboard ───────────────────────────────────────────────────
export type LeaderboardEntry = {
  user: User;
  uniqueSpecies: number;
  totalObservations: number;
};

// ── List ──────────────────────────────────────────────────────────
export type CreateListInput = {
  name: string;
  description?: string;
};

export type UpdateListInput = {
  name?: string;
  description?: string | null;
};

export type List = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  userId: string;
};

export type ListWithDetails = List & {
  observationCount: number;
};

// ── Invite Token ─────────────────────────────────────────────────
export type InviteTokenResponse = {
  token: string;
  url: string;
};

// ── Pending (offline) observation ─────────────────────────────────
export type PendingObservation = {
  id: string;
  birdId: string;
  birdName: string;
  note?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
};

// ── Feed ──────────────────────────────────────────────────────────
export type FeedItem = {
  id: string;
  date: string;
  user: User;
  bird: Bird;
};
