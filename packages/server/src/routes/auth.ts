import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body as { credential: string };

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId: payload.sub },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          image: payload.picture,
        },
      });
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
      },
    });

    res.cookie("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS,
      path: "/",
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      city: user.city,
      about: user.about,
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.session;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  res.clearCookie("session", { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
