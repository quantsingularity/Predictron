import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export const SESSION_COOKIE_NAME = "predictron_session";

/// Shared so login (set) and logout (clear) always use matching options.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
    path: "/",
  };
}

export interface SessionPayload {
  sub: string; // user id
  address: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; address: string; role: "USER" | "ADMIN" };
    }
  }
}

/// Reads the session from an httpOnly cookie and re-reads the role from
/// the DB on every request, rather than trusting the JWT's own claim.
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing session" });
  }

  let payload: SessionPayload;
  try {
    payload = jwt.verify(token, env.SESSION_JWT_SECRET) as SessionPayload;
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired session" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Session refers to a deleted user" });
  }

  req.user = { id: user.id, address: user.address, role: user.role };
  next();
}

/// Requires requireAuth to have run first.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res
      .status(403)
      .json({ success: false, message: "Admin role required" });
  }
  next();
}
