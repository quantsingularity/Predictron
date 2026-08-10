import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { publicClient } from "../lib/viemClient.js";
import { predictionGameAbi } from "../lib/abis.js";
import { env } from "../config/env.js";
import { computeLeaderboard } from "../lib/leaderboard.js";

export const predictionRouter = Router();

/// Live round state, read straight from the contract, this is what feeds
/// the "Live" card. Placing a bet is a direct `bet()` contract call from
/// the user's wallet in the frontend, not a route here.
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

/// Leaderboard ranked by net winnings, computed entirely from indexed
/// contract events (BetPlaced + Claimed), there is no separately-tracked
/// "score" a user or admin could edit. amount/payout are stored as
/// wei-precision decimal strings (they can exceed Number.MAX_SAFE_INTEGER),
/// so the sums are done with BigInt in JS rather than a SQL SUM().
/// This scans every resolved bet on every call, which is fine at the
/// bet volumes a single-market game like this sees; if that stops being
/// true, replace it with a materialized per-user total refreshed by the
/// indexer job instead of computing it per-request.
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
