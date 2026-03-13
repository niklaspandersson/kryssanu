import { z } from 'zod';

// ── Bird ────────────────────────────────────────────────────────────
export const BirdSchema = z.object({
  id: z.string(),
  swedish: z.string(),
  family: z.string(),
  visitor: z.boolean(),
});
export type Bird = z.infer<typeof BirdSchema>;

// ── Observation ─────────────────────────────────────────────────────
export const ObservationSchema = z.object({
  id: z.string(),
  date: z.string(),
  location: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  birdId: z.string(),
  userId: z.string(),
});
export type Observation = z.infer<typeof ObservationSchema>;

export const ObservationWithBirdSchema = ObservationSchema.extend({
  bird: BirdSchema,
});
export type ObservationWithBird = z.infer<typeof ObservationWithBirdSchema>;

export const CreateObservationSchema = z.object({
  birdId: z.string(),
  note: z.string().optional(),
  location: z.string().optional(),
});
export type CreateObservationInput = z.infer<typeof CreateObservationSchema>;

// ── User (public-facing) ───────────────────────────────────────────
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  city: z.string().nullable(),
  about: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const UpdateProfileSchema = z.object({
  city: z.string().max(100).optional(),
  about: z.string().max(500).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ── Observed birds map ──────────────────────────────────────────────
export const ObservedBirdsSchema = z.record(z.string(), z.boolean());
export type ObservedBirds = z.infer<typeof ObservedBirdsSchema>;

// ── Checklist ───────────────────────────────────────────────────────
export type ChecklistData = {
  birds: Bird[];
  observed: Record<string, string[]>;
};

// ── Event ───────────────────────────────────────────────────────────
export const CreateEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
});
export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const EventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  createdAt: z.string(),
  creatorId: z.string(),
});
export type Event = z.infer<typeof EventSchema>;

// ── Participant ─────────────────────────────────────────────────────
export const ParticipantStatusSchema = z.enum([
  'INVITED',
  'ACCEPTED',
  'DECLINED',
]);
export type ParticipantStatus = z.infer<typeof ParticipantStatusSchema>;

export const InviteSchema = z.object({
  email: z.string().email(),
});

export const RespondToInviteSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

// ── User Stats ────────────────────────────────────────────────────
export const UserStatsSchema = z.object({
  uniqueSpeciesLifetime: z.number(),
  uniqueSpeciesThisYear: z.number(),
  totalObservations: z.number(),
  observationsThisWeek: z.number(),
  observationsThisMonth: z.number(),
  latestObservation: z.string().nullable(),
  topFamilies: z.array(z.object({ family: z.string(), count: z.number() })),
});
export type UserStats = z.infer<typeof UserStatsSchema>;


// ── Event (with participants) ─────────────────────────────────────
export const ParticipantWithUserSchema = z.object({
  user: UserSchema,
  status: ParticipantStatusSchema,
});
export type ParticipantWithUser = z.infer<typeof ParticipantWithUserSchema>;

export const EventWithParticipantsSchema = EventSchema.extend({
  creator: UserSchema,
  participants: z.array(ParticipantWithUserSchema),
  observationCount: z.number(),
});
export type EventWithParticipants = z.infer<typeof EventWithParticipantsSchema>;

// ── Leaderboard ───────────────────────────────────────────────────
export const LeaderboardEntrySchema = z.object({
  user: UserSchema,
  uniqueSpecies: z.number(),
  totalObservations: z.number(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

// ── Feed ──────────────────────────────────────────────────────────
export const FeedItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  user: UserSchema,
  bird: BirdSchema,
});
export type FeedItem = z.infer<typeof FeedItemSchema>;
