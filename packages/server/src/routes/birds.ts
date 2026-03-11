import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const birds = await prisma.bird.findMany({
    where: { visitor: false },
    orderBy: { swedish: "asc" },
  });
  res.json(birds);
});

router.get("/:id", async (req, res) => {
  const bird = await prisma.bird.findUnique({
    where: { id: req.params.id },
  });
  if (!bird) {
    res.status(404).json({ error: "Bird not found" });
    return;
  }
  res.json(bird);
});

export default router;
