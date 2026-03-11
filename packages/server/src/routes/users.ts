import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const userSelect = { id: true, name: true, email: true, image: true };

// Search users by name
router.get("/search", async (req, res) => {
  const q = (req.query.q as string) || "";
  if (q.length < 2) {
    res.json([]);
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      name: { contains: q },
      id: { not: req.user!.id },
    },
    select: userSelect,
    take: 10,
  });

  res.json(users);
});

// Public profile
router.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: userSelect,
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

export default router;
