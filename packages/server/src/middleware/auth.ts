import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db.ts";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        city: string | null;
        about: string | null;
      };
    }
  }
}

export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const sessionId = req.cookies?.session;
  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, name: true, email: true, image: true, city: true, about: true } } },
    });
    if (session && session.expiresAt > new Date()) {
      req.user = session.user;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
