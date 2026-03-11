import { z } from "zod";

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
  eventId: z.string().nullable(),
});
export type Observation = z.infer<typeof ObservationSchema>;

export const CreateObservationSchema = z.object({
  birdId: z.string(),
  eventId: z.string().optional(),
});
export type CreateObservationInput = z.infer<typeof CreateObservationSchema>;

// ── User (public-facing) ───────────────────────────────────────────
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

// ── Observed birds map ──────────────────────────────────────────────
export const ObservedBirdsSchema = z.record(z.string(), z.boolean());
export type ObservedBirds = z.infer<typeof ObservedBirdsSchema>;

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
  "INVITED",
  "ACCEPTED",
  "DECLINED",
]);
export type ParticipantStatus = z.infer<typeof ParticipantStatusSchema>;

export const InviteSchema = z.object({
  email: z.string().email(),
});

export const RespondToInviteSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});
