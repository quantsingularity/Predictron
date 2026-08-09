import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

const { prisma } = await import("../src/lib/prisma.js");
const { requireAuth, requireAdmin, SESSION_COOKIE_NAME, sessionCookieOptions } =
  await import("../src/middleware/auth.middleware.js");
const { env } = await import("../src/config/env.js");

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function signSession(sub: string, address: string, expiresInSeconds = 3600) {
  return jwt.sign({ sub, address }, env.SESSION_JWT_SECRET, {
    expiresIn: expiresInSeconds,
  });
}

describe("requireAuth", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("rejects a request with no session cookie at all", async () => {
    const req = { cookies: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); // fails before ever touching the DB
  });

  it("rejects a garbage/tampered token", async () => {
    const req = {
      cookies: { [SESSION_COOKIE_NAME]: "not-a-real-jwt" },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    const token = signSession("user-1", "0xabc", -10); // already expired
    const req = {
      cookies: { [SESSION_COOKIE_NAME]: token },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a validly-signed token for a user that no longer exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    const token = signSession("deleted-user", "0xabc");
    const req = {
      cookies: { [SESSION_COOKIE_NAME]: token },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token, re-reads the role from the DB, and calls next()", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      address: "0xabc",
      role: "ADMIN", // DB says ADMIN even though the token carries no role at all
    } as never);
    const token = signSession("user-1", "0xabc");
    const req = {
      cookies: { [SESSION_COOKIE_NAME]: token },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: "user-1", address: "0xabc", role: "ADMIN" });
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("rejects a request with no authenticated user", () => {
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a non-admin user", () => {
    const req = {
      user: { id: "u1", address: "0xabc", role: "USER" as const },
    } as Request;
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an admin user through", () => {
    const req = {
      user: { id: "u1", address: "0xabc", role: "ADMIN" as const },
    } as Request;
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("sessionCookieOptions", () => {
  it("is httpOnly and matches the configured TTL", () => {
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  });
});
