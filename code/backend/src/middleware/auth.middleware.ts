import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export const SESSION_COOKIE_NAME = "predictron_session";

/// Shared cookie options so login (set) and logout (clear) always agree.
/// A mismatched `secure`/`sameSite` between set and clear is a classic way
/// to leave a stale cookie the browser won't overwrite.
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

/// Requires a valid session. Three properties worth calling out:
/// 1. The session token lives in an httpOnly cookie, never in a JSON
/// response body or localStorage, client-side JS (and therefore an
/// XSS payload) can never read it, only send it back automatically.
/// 2. A missing or malformed cookie is rejected outright, no fallback
/// path treats an absent token as authenticated.
/// 3. The user's role is re-read from the database on every request
/// instead of trusting whatever role was baked into the JWT at login
/// time, so a role change (promotion, demotion, ban) takes effect
/// immediately rather than waiting for the session to expire.
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

/// Applied in addition to requireAuth on every admin route. Every admin
/// endpoint is gated by both: a valid session AND a database-confirmed
/// ADMIN role, checked on every request.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res
      .status(403)
      .json({ success: false, message: "Admin role required" });
  }
  next();
}
