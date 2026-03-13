import { Router } from 'express';
import { prisma } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { CreateObservationSchema } from '@kryssanu/shared';

const router = Router();

// All observation routes require auth
router.use(requireAuth);

// Get checklist: all birds + user's observation dates per bird
router.get('/checklist', asyncHandler(async (req, res) => {
  const [allBirds, userObs] = await Promise.all([
    prisma.bird.findMany({
      where: { visitor: false },
      orderBy: { swedish: 'asc' },
    }),
    prisma.observation.findMany({
      where: { userId: req.user!.id },
      select: { birdId: true, date: true },
      orderBy: { date: 'asc' },
    }),
  ]);

  const observed: Record<string, string[]> = {};
  for (const o of userObs) {
    if (!observed[o.birdId]) observed[o.birdId] = [];
    observed[o.birdId].push(o.date.toISOString());
  }

  res.json({ birds: allBirds, observed });
}));

// Get map of observed bird IDs for current user
router.get('/observed', asyncHandler(async (req, res) => {
  const list = await prisma.observation.findMany({
    select: { birdId: true },
    distinct: ['birdId'],
    where: { userId: req.user!.id },
  });

  const result: Record<string, boolean> = {};
  list.forEach(o => (result[o.birdId] = true));
  res.json(result);
}));

// Get latest observations for current user (with bird data)
router.get('/latest', asyncHandler(async (req, res) => {
  const observations = await prisma.observation.findMany({
    where: { userId: req.user!.id },
    include: { bird: true },
    orderBy: { date: 'desc' },
    take: 10,
  });
  res.json(observations);
}));

// Get observations for a specific bird by current user
router.get('/bird/:birdId', asyncHandler(async (req, res) => {
  const observations = await prisma.observation.findMany({
    where: {
      userId: req.user!.id,
      birdId: req.params.birdId,
    },
    orderBy: { date: 'desc' },
  });
  res.json(observations);
}));

// Create an observation
router.post('/', asyncHandler(async (req, res) => {
  const parsed = CreateObservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const observation = await prisma.observation.create({
    data: {
      birdId: parsed.data.birdId,
      userId: req.user!.id,
      note: parsed.data.note,
      location: parsed.data.location,
      date: new Date(),
    },
  });

  // Auto-link to all active events where user is accepted participant
  const matchingEvents = await prisma.event.findMany({
    where: {
      startsAt: { lte: observation.date },
      endsAt: { gte: observation.date },
      participants: { some: { userId: req.user!.id, status: 'ACCEPTED' } },
    },
    select: { id: true },
  });

  if (matchingEvents.length > 0) {
    await prisma.observationEvent.createMany({
      data: matchingEvents.map((e) => ({
        observationId: observation.id,
        eventId: e.id,
      })),
    });
  }

  res.status(201).json(observation);
}));

export default router;
