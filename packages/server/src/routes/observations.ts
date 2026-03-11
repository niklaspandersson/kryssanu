import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { CreateObservationSchema } from '@kryssanu/shared';

const router = Router();

// All observation routes require auth
router.use(requireAuth);

// Get map of observed bird IDs for current user
router.get('/observed', async (req, res) => {
  const list = await prisma.observation.findMany({
    select: { birdId: true },
    distinct: ['birdId'],
    where: { userId: req.user!.id },
  });

  const result: Record<string, boolean> = {};
  list.forEach(o => (result[o.birdId] = true));
  res.json(result);
});

// Get latest observations for current user (with bird data)
router.get('/latest', async (req, res) => {
  const observations = await prisma.observation.findMany({
    where: { userId: req.user!.id },
    include: { bird: true },
    orderBy: { date: 'desc' },
    take: 10,
  });
  res.json(observations);
});

// Get observations for a specific bird by current user
router.get('/bird/:birdId', async (req, res) => {
  const observations = await prisma.observation.findMany({
    where: {
      userId: req.user!.id,
      birdId: req.params.birdId,
    },
    orderBy: { date: 'desc' },
  });
  res.json(observations);
});

// Create an observation
router.post('/', async (req, res) => {
  const parsed = CreateObservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const observation = await prisma.observation.create({
    data: {
      birdId: parsed.data.birdId,
      userId: req.user!.id,
      eventId: parsed.data.eventId,
      note: parsed.data.note,
      location: parsed.data.location,
      date: new Date(),
    },
  });
  res.status(201).json(observation);
});

export default router;
