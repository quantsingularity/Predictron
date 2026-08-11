import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { publicClient } from "../lib/viemClient.js";
import { stakingVaultAbi } from "../lib/abis.js";
import { env } from "../config/env.js";

export const stakingRouter = Router();

/// Read-only; staking/unstaking happen via the user's own wallet.
stakingRouter.get("/positions", requireAuth, async (req, res, next) => {
  try {
    const positions = await prisma.indexedStake.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });

    // Enrich with live accrued reward straight from the contract.
    const enriched = await Promise.all(
      positions.map(async (p) => {
        if (p.status !== "ACTIVE")
          return {
            ...p,
            chainPositionId: p.chainPositionId.toString(),
            planId: p.planId.toString(),
          };
        const pending = await publicClient.readContract({
          address: env.STAKING_VAULT_ADDRESS as `0x${string}`,
          abi: stakingVaultAbi,
          functionName: "pendingReward",
          args: [req.user!.address as `0x${string}`, p.chainPositionId],
        });
        return {
          ...p,
          chainPositionId: p.chainPositionId.toString(),
          planId: p.planId.toString(),
          pendingReward: pending.toString(),
        };
      }),
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});
