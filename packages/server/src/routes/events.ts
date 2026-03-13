import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  CreateEventSchema,
  InviteSchema,
  RespondToInviteSchema,
} from "@kryssanu/shared";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth);

const userSelect = { id: true, name: true, email: true, image: true };

// List events for current user (created + participating)
router.get("/", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const now = new Date();
  const status = req.query.status as string | undefined;

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { participants: { some: { userId, status: { not: "DECLINED" } } } },
      ],
    },
    include: {
      creator: { select: userSelect },
      participants: {
        include: { user: { select: userSelect } },
      },
      _count: { select: { observationEvents: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  const mapped = events
    .map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
      creatorId: e.creatorId,
      creator: e.creator,
      participants: e.participants.map((p) => ({
        user: p.user,
        status: p.status,
      })),
      observationCount: e._count.observationEvents,
    }))
    .filter((e) => {
      if (!status) return true;
      const start = new Date(e.startsAt);
      const end = new Date(e.endsAt);
      if (status === "active") return start <= now && end >= now;
      if (status === "upcoming") return start > now;
      if (status === "past") return end < now;
      return true;
    });

  res.json(mapped);
}));

// Create event
router.post("/", asyncHandler(async (req, res) => {
  const parsed = CreateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const event = await prisma.event.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      creatorId: req.user!.id,
      participants: {
        create: {
          userId: req.user!.id,
          status: "ACCEPTED",
        },
      },
    },
    include: {
      creator: { select: userSelect },
      participants: {
        include: { user: { select: userSelect } },
      },
      _count: { select: { observationEvents: true } },
    },
  });

  res.status(201).json({
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    createdAt: event.createdAt.toISOString(),
    participants: event.participants.map((p) => ({
      user: p.user,
      status: p.status,
    })),
    observationCount: event._count.observationEvents,
  });
}));

// Event detail
router.get("/:id", asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: userSelect },
      participants: {
        include: { user: { select: userSelect } },
      },
      _count: { select: { observationEvents: true } },
    },
  });

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const userId = req.user!.id;
  const isMember =
    event.creatorId === userId ||
    event.participants.some((p) => p.user.id === userId);
  if (!isMember) {
    res.status(403).json({ error: "Not a member of this event" });
    return;
  }

  res.json({
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    createdAt: event.createdAt.toISOString(),
    participants: event.participants.map((p) => ({
      user: p.user,
      status: p.status,
    })),
    observationCount: event._count.observationEvents,
  });
}));

// Invite user by email
router.post("/:id/invite", asyncHandler(async (req, res) => {
  const parsed = InviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (event.creatorId !== req.user!.id) {
    res.status(403).json({ error: "Only the creator can invite" });
    return;
  }

  const invitee = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!invitee) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const participant = await prisma.participant.upsert({
    where: {
      userId_eventId: { userId: invitee.id, eventId: req.params.id },
    },
    update: { status: "INVITED" },
    create: {
      userId: invitee.id,
      eventId: req.params.id,
      status: "INVITED",
    },
    include: { user: { select: userSelect } },
  });

  res.status(201).json({ user: participant.user, status: participant.status });
}));

// Respond to invite
router.post("/:id/respond", asyncHandler(async (req, res) => {
  const parsed = RespondToInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const participant = await prisma.participant.findUnique({
    where: {
      userId_eventId: { userId: req.user!.id, eventId: req.params.id },
    },
  });

  if (!participant) {
    res.status(404).json({ error: "No invitation found" });
    return;
  }

  const updated = await prisma.participant.update({
    where: { id: participant.id },
    data: {
      status: parsed.data.status,
      joinedAt: new Date(),
    },
  });

  res.json({ status: updated.status });
}));

// Event leaderboard
router.get("/:id/leaderboard", asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      participants: {
        where: { status: "ACCEPTED" },
        include: { user: { select: userSelect } },
      },
    },
  });

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const userId = req.user!.id;
  const isMember =
    event.creatorId === userId ||
    event.participants.some((p) => p.user.id === userId);
  if (!isMember) {
    res.status(403).json({ error: "Not a member of this event" });
    return;
  }

  const participantIds = event.participants.map((p) => p.userId);

  const observationEvents = await prisma.observationEvent.findMany({
    where: { eventId: event.id },
    include: { observation: { select: { userId: true, birdId: true } } },
  });

  const statsMap = new Map<string, { species: Set<string>; total: number }>();
  participantIds.forEach((id) =>
    statsMap.set(id, { species: new Set(), total: 0 })
  );

  observationEvents.forEach((oe) => {
    const entry = statsMap.get(oe.observation.userId);
    if (entry) {
      entry.species.add(oe.observation.birdId);
      entry.total++;
    }
  });

  const leaderboard = event.participants
    .map((p) => {
      const s = statsMap.get(p.userId)!;
      return {
        user: p.user,
        uniqueSpecies: s.species.size,
        totalObservations: s.total,
      };
    })
    .sort((a, b) => b.uniqueSpecies - a.uniqueSpecies);

  res.json(leaderboard);
}));

export default router;
