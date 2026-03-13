import { Router } from "express";
import { prisma } from "../db.ts";
import { requireAuth } from "../middleware/auth.ts";
import { asyncHandler } from "../middleware/asyncHandler.ts";

const router = Router();
router.use(requireAuth);

async function getUserStats(userId: string) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const day = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    lifetimeSpecies,
    yearSpecies,
    totalObservations,
    weekObservations,
    monthObservations,
    latestObs,
    familyCounts,
  ] = await Promise.all([
    prisma.observation
      .findMany({
        where: { userId },
        select: { birdId: true },
        distinct: ["birdId"],
      })
      .then((r) => r.length),
    prisma.observation
      .findMany({
        where: { userId, date: { gte: startOfYear } },
        select: { birdId: true },
        distinct: ["birdId"],
      })
      .then((r) => r.length),
    prisma.observation.count({ where: { userId } }),
    prisma.observation.count({
      where: { userId, date: { gte: startOfWeek } },
    }),
    prisma.observation.count({
      where: { userId, date: { gte: startOfMonth } },
    }),
    prisma.observation.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.observation
      .findMany({
        where: { userId },
        select: { bird: { select: { family: true } } },
      })
      .then((obs) => {
        const counts = new Map<string, number>();
        obs.forEach((o) => {
          counts.set(o.bird.family, (counts.get(o.bird.family) || 0) + 1);
        });
        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([family, count]) => ({ family, count }));
      }),
  ]);

  return {
    uniqueSpeciesLifetime: lifetimeSpecies,
    uniqueSpeciesThisYear: yearSpecies,
    totalObservations,
    observationsThisWeek: weekObservations,
    observationsThisMonth: monthObservations,
    latestObservation: latestObs?.date.toISOString() ?? null,
    topFamilies: familyCounts,
  };
}

// Current user's stats
router.get("/me", asyncHandler(async (req, res) => {
  const stats = await getUserStats(req.user!.id);
  res.json(stats);
}));

// Another user's stats
router.get("/user/:userId", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { id: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const stats = await getUserStats(req.params.userId);
  res.json(stats);
}));


export default router;
