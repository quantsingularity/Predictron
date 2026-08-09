import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

export const adminRouter = Router();

// Every route in this file is gated by BOTH requireAuth (valid session)
// AND requireAdmin (role === 'ADMIN', re-checked against the DB on every
// request).
//
// Notice there is no "approve withdrawal" route here. Withdrawals aren't a
// database row an admin flips to "approved" — they're the user calling
// StakingVault.unstake() or PredictionGame.claim() with their own wallet.
// There is nothing for an admin (or an attacker impersonating one) to
// approve, because there is no custodial queue.
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 50;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          address: true,
          role: true,
          referralCode: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count(),
    ]);
    res.json({
      success: true,
      data: users,
      pagination: { page, pageSize, total },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/stakes", async (req, res, next) => {
  try {
    const stakes = await prisma.indexedStake.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { address: true } } },
    });
    res.json({
      success: true,
      data: stakes.map((s) => ({
        ...s,
        chainPositionId: s.chainPositionId.toString(),
        planId: s.planId.toString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/tickets", async (_req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { status: { not: "CLOSED" } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { address: true } } },
    });
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
});

/// Promoting a user to ADMIN is itself an admin-only, audited action —
/// nothing in this codebase can self-assign the ADMIN role. In production,
/// seed the first admin via a one-off migration/script run against the DB
/// directly, not an API route.
adminRouter.post("/tickets/:id/close", async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "CLOSED" },
    });
    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});
