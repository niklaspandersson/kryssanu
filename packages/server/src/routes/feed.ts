import { Router } from "express";
import { prisma } from "../db.ts";
import { requireAuth } from "../middleware/auth.ts";
import { asyncHandler } from "../middleware/asyncHandler.ts";

const router = Router();
router.use(requireAuth);

// Recent observations from users in shared events
router.get("/", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const cursor = req.query.cursor as string | undefined;
  const limit = 20;

  // Find all events the user participates in
  const participations = await prisma.participant.findMany({
    where: { userId, status: "ACCEPTED" },
    select: { eventId: true },
  });
  const eventIds = participations.map((p) => p.eventId);

  if (eventIds.length === 0) {
    res.json({ items: [], nextCursor: null });
    return;
  }

  // Find all users in those events
  const coParticipants = await prisma.participant.findMany({
    where: { eventId: { in: eventIds }, status: "ACCEPTED" },
    select: { userId: true },
    distinct: ["userId"],
  });
  const peerIds = coParticipants
    .map((p) => p.userId)
    .filter((id) => id !== userId);

  if (peerIds.length === 0) {
    res.json({ items: [], nextCursor: null });
    return;
  }

  const observations = await prisma.observation.findMany({
    where: {
      userId: { in: peerIds },
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      bird: true,
    },
    orderBy: { date: "desc" },
    take: limit + 1,
  });

  const hasMore = observations.length > limit;
  const items = observations.slice(0, limit).map((o) => ({
    id: o.id,
    date: o.date.toISOString(),
    user: o.user,
    bird: {
      id: o.bird.id,
      swedish: o.bird.swedish,
      family: o.bird.family,
      visitor: o.bird.visitor,
    },
  }));

  res.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}));

export default router;
