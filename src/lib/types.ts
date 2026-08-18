// ── Bird ────────────────────────────────────────────────────────────
/** Fyndkategori A–E, per AERC definitions. */
export type Fyndkategori = "A" | "B" | "C" | "D" | "E";

/**
 * Status in Sweden:
 * `H` häckfågel · `h` oklar/oregelbunden häckning · `F` flyttfågel ·
 * `T` tillfällig · `R` raritet (färre än 100 fynd) · `I` introduktion
 *
 * `I` covers every kategori E taxon; Sverigelistan itself leaves those blank.
 */
export type BirdStatus = "H" | "h" | "F" | "T" | "R" | "I";

/** A taxon from Sverigelistan. Species and subspecies are both birds. */
export type Bird = {
  id: string;
  swedish: string;
  english: string | null;
  family: string;
  familyLatin: string | null;
  orderLatin: string | null;
  orderSwedish: string | null;
  /** The species a subspecies belongs to; null on species. A bird with a
   * parent is a subspecies. */
  parentId: string | null;
  /** Always set on a listed bird; null only once a bird has been delisted. */
  kategori: Fyndkategori | null;
  status: BirdStatus | null;
  extinct: boolean;
  /** No longer on Sverigelistan; kept for the observations that reference it. */
  delisted: boolean;
};

// ── Observation image ───────────────────────────────────────────────
/** Reference to an observation's image variants (large + thumb). */
export type ObservationImageRef = {
  id: string;
  url: string;
  thumbUrl: string;
};

/** Result of uploading an image to an observation. */
export type ObservationImage = ObservationImageRef & {
  observationId: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

/** Public image shown on a bird's details page, with uploader credit. */
export type BirdImage = {
  id: string;
  url: string;
  thumbUrl: string;
  uploaderId: string;
  uploaderName: string | null;
  year: number;
  location: string | null;
  width: number | null;
  height: number | null;
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
  /** The observation's image, when one is attached. Only populated by endpoints that join it. */
  image?: ObservationImageRef | null;
};

export type ObservationWithBird = Observation & {
  bird: Bird;
  /** List ids this observation belongs to. Only populated by some endpoints. */
  listIds?: string[];
};

export type UpdateObservationInput = {
  date?: string;
  location?: string | null;
  note?: string | null;
  listIds?: string[];
};

export type BulkObservationPayload =
  | { ids: string[]; op: "setLocation"; value: string | null }
  | { ids: string[]; op: "setDate"; value: string }
  | { ids: string[]; op: "addList" | "removeList"; value: string }
  | { ids: string[]; op: "delete" };

export type PaginatedObservations = {
  observations: ObservationWithBird[];
  total: number;
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
/**
 * User preferences, stored as one serialized JSON column on User so that adding
 * a setting needs no database migration. Defaults and reading live in
 * src/lib/settings.ts.
 */
export type UserSettings = {
  /** Offer subspecies alongside species when picking a bird. */
  showSubspecies: boolean;
};

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  city: string | null;
  about: string | null;
  /**
   * Only the keys the user has actually saved; read via readSettings().
   * Absent on other users — formatUserMinimal does not expose it.
   */
  settings?: Partial<UserSettings> | null;
};

export type UpdateProfileInput = {
  city?: string;
  about?: string;
  /** Merged into the stored settings server-side, so a partial patch is safe. */
  settings?: Partial<UserSettings>;
};

// ── Observed birds map ──────────────────────────────────────────────
export type ObservedBirds = Record<string, boolean>;

// ── Checklist ───────────────────────────────────────────────────────
/**
 * Per-species observation dates, aggregated server-side. Only the endpoints of
 * each bucket are sent — the page never needed the dates in between, and
 * returning them all made the payload grow with the user's observation count.
 * The `ThisYear` fields are null when the species has not been seen this year.
 */
export type ChecklistEntry = {
  firstDate: string;
  lastDate: string;
  firstThisYear: string | null;
  lastThisYear: string | null;
};

export type ChecklistData = {
  observed: Record<string, ChecklistEntry>;
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

export type PaginatedLeaderboard = {
  entries: LeaderboardEntry[];
  /** Accepted participants in the event, not the number of entries returned. */
  total: number;
  /**
   * The current user's own row and rank, ranked over the whole event rather
   * than the returned page. Null when they are not an accepted participant.
   */
  me: { rank: number; entry: LeaderboardEntry } | null;
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
