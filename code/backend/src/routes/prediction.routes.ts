import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { publicClient } from "../lib/viemClient.js";
import { predictionGameAbi } from "../lib/abis.js";
import { env } from "../config/env.js";
import { computeLeaderboard } from "../lib/leaderboard.js";

export const predictionRouter = Router();

/// Live round state, read straight from the contract.
predictionRouter.get("/rounds/:epoch", async (req, res, next) => {
  try {
    const epoch = BigInt(req.params.epoch);
    const round = await publicClient.readContract({
      address: env.PREDICTION_GAME_ADDRESS as `0x${string}`,
      abi: predictionGameAbi,
      functionName: "rounds",
      args: [epoch],
    });
    res.json({
      success: true,
      data: {
        epoch: round[0].toString(),
        startTimestamp: round[1].toString(),
        lockTimestamp: round[2].toString(),
        closeTimestamp: round[3].toString(),
        lockPrice: round[4].toString(),
        closePrice: round[5].toString(),
        lockPriceSet: round[6],
        closePriceSet: round[7],
        totalUpAmount: round[8].toString(),
        totalDownAmount: round[9].toString(),
        cancelled: round[10],
      },
    });
  } catch (err) {
    next(err);
  }
});

predictionRouter.get("/my-bets", requireAuth, async (req, res, next) => {
  try {
    const bets = await prisma.indexedBet.findMany({
      where: { userId: req.user!.id },
      orderBy: { epoch: "desc" },
      take: 50,
    });
    res.json({
      success: true,
      data: bets.map((b) => ({ ...b, epoch: b.epoch.toString() })),
    });
  } catch (err) {
    next(err);
  }
});

/// Leaderboard ranked by net winnings, computed from indexed contract
/// events. amount/payout exceed Number.MAX_SAFE_INTEGER, so sums use BigInt.
predictionRouter.get("/leaderboard", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const resolvedBets = await prisma.indexedBet.findMany({
      where: { claimTxHash: { not: null }, payout: { not: null } },
      select: {
        userId: true,
        amount: true,
        payout: true,
        user: { select: { address: true } },
      },
    });

    const ranked = computeLeaderboard(
      resolvedBets.map((b) => ({
        userId: b.userId,
        address: b.user.address,
        amount: b.amount,
        payout: b.payout!,
      })),
      limit,
    );

    res.json({ success: true, data: ranked });
  } catch (err) {
    next(err);
  }
});
