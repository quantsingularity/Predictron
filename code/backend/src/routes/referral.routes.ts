import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

export const referralRouter = Router();

referralRouter.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const [me, referrals, payouts] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { referralCode: true },
      }),
      prisma.user.findMany({
        where: { referredById: req.user!.id },
        select: { address: true, createdAt: true },
      }),
      prisma.referralPayout.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const pendingTotal = payouts
      .filter((p) => p.status === "ACCRUED")
      .reduce((sum, p) => sum + BigInt(p.amount), 0n);
    const claimedTotal = payouts
      .filter((p) => p.status === "CLAIMED")
      .reduce((sum, p) => sum + BigInt(p.amount), 0n);

    res.json({
      success: true,
      data: {
        referralCode: me.referralCode,
        referredCount: referrals.length,
        referrals,
        pendingRewardWei: pendingTotal.toString(),
        claimedRewardWei: claimedTotal.toString(),
        payouts: payouts.map((p) => ({
          ...p,
          epoch: p.epoch?.toString() ?? null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
