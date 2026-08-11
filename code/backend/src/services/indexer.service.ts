import { publicClient } from "../lib/viemClient.js";
import { stakingVaultAbi, predictionGameAbi } from "../lib/abis.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { randomBytes } from "node:crypto";

const MAX_BLOCK_RANGE = 2000n; // stay under most RPC providers' getLogs limits

async function getCursor(
  contract: string,
  deployBlock: bigint,
): Promise<bigint> {
  const row = await prisma.indexerCursor.findUnique({
    where: { contractAddress: contract },
  });
  return row?.lastBlock ?? deployBlock;
}

async function setCursor(contract: string, block: bigint): Promise<void> {
  await prisma.indexerCursor.upsert({
    where: { contractAddress: contract },
    create: { contractAddress: contract, lastBlock: block },
    update: { lastBlock: block },
  });
}

async function findOrCreateUserByAddress(address: string) {
  const lower = address.toLowerCase();
  return prisma.user.upsert({
    where: { address: lower },
    create: { address: lower, referralCode: randomBytes(4).toString("hex") },
    update: {},
  });
}

/// Credits a stake only from a confirmed `Staked` event, never client input.
export async function indexStakingVault(): Promise<void> {
  const address = env.STAKING_VAULT_ADDRESS as `0x${string}`;
  const safeTip = await safeChainTip();
  let fromBlock =
    (await getCursor(address, env.STAKING_VAULT_DEPLOY_BLOCK)) + 1n;

  while (fromBlock <= safeTip) {
    const toBlock =
      fromBlock + MAX_BLOCK_RANGE > safeTip
        ? safeTip
        : fromBlock + MAX_BLOCK_RANGE;

    const [stakedLogs, unstakedLogs] = await Promise.all([
      publicClient.getContractEvents({
        address,
        abi: stakingVaultAbi,
        eventName: "Staked",
        fromBlock,
        toBlock,
      }),
      publicClient.getContractEvents({
        address,
        abi: stakingVaultAbi,
        eventName: "Unstaked",
        fromBlock,
        toBlock,
      }),
    ]);

    for (const log of stakedLogs) {
      const { user, positionId, planId, amount, unlockTimestamp } = log.args;
      if (
        !user ||
        positionId === undefined ||
        planId === undefined ||
        amount === undefined
      )
        continue;
      const dbUser = await findOrCreateUserByAddress(user);
      await prisma.indexedStake.upsert({
        where: { stakeTxHash: log.transactionHash },
        create: {
          userId: dbUser.id,
          chainPositionId: positionId,
          planId,
          amount: amount.toString(),
          stakeTxHash: log.transactionHash,
          startBlock: log.blockNumber,
          unlockTimestamp:
            unlockTimestamp && unlockTimestamp > 0n
              ? new Date(Number(unlockTimestamp) * 1000)
              : null,
        },
        update: {},
      });
    }

    for (const log of unstakedLogs) {
      const { user, positionId, amount, rewardPaid } = log.args;
      if (!user || positionId === undefined) continue;
      const dbUser = await findOrCreateUserByAddress(user);
      const existing = await prisma.indexedStake.findFirst({
        where: {
          userId: dbUser.id,
          chainPositionId: positionId,
          status: "ACTIVE",
        },
      });
      if (existing) {
        await prisma.indexedStake.update({
          where: { id: existing.id },
          data: {
            status: "UNSTAKED",
            unstakeTxHash: log.transactionHash,
            ...(rewardPaid !== undefined
              ? { rewardPaid: rewardPaid.toString() }
              : {}),
          },
        });
      }
      void amount;
    }

    await setCursor(address, toBlock);
    fromBlock = toBlock + 1n;
  }
}

export async function indexPredictionGame(): Promise<void> {
  const address = env.PREDICTION_GAME_ADDRESS as `0x${string}`;
  const safeTip = await safeChainTip();
  let fromBlock =
    (await getCursor(address, env.PREDICTION_GAME_DEPLOY_BLOCK)) + 1n;

  while (fromBlock <= safeTip) {
    const toBlock =
      fromBlock + MAX_BLOCK_RANGE > safeTip
        ? safeTip
        : fromBlock + MAX_BLOCK_RANGE;

    const [betLogs, claimLogs, referralAccruedLogs, referralClaimedLogs] =
      await Promise.all([
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "BetPlaced",
          fromBlock,
          toBlock,
        }),
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "Claimed",
          fromBlock,
          toBlock,
        }),
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "ReferralRewardAccrued",
          fromBlock,
          toBlock,
        }),
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "ReferralRewardClaimed",
          fromBlock,
          toBlock,
        }),
      ]);

    for (const log of betLogs) {
      const { user, epoch, position, amount } = log.args;
      if (
        !user ||
        epoch === undefined ||
        position === undefined ||
        amount === undefined
      )
        continue;
      const dbUser = await findOrCreateUserByAddress(user);
      await prisma.indexedBet.upsert({
        where: { betTxHash: log.transactionHash },
        create: {
          userId: dbUser.id,
          epoch,
          position: position === 1 ? "UP" : "DOWN",
          amount: amount.toString(),
          betTxHash: log.transactionHash,
        },
        update: {},
      });
    }

    for (const log of claimLogs) {
      const { user, epoch, amount } = log.args;
      if (!user || epoch === undefined) continue;
      const dbUser = await findOrCreateUserByAddress(user);
      const existing = await prisma.indexedBet.findFirst({
        where: { userId: dbUser.id, epoch },
      });
      if (existing) {
        await prisma.indexedBet.update({
          where: { id: existing.id },
          data: {
            claimTxHash: log.transactionHash,
            ...(amount !== undefined ? { payout: amount.toString() } : {}),
          },
        });
      }
    }

    // One ACCRUED row per winning claim; a claim event stamps all of a
    // referrer's ACCRUED rows as CLAIMED at once.
    for (const log of referralAccruedLogs) {
      const { referrer, referredUser, epoch, amount } = log.args;
      if (
        !referrer ||
        !referredUser ||
        epoch === undefined ||
        amount === undefined
      )
        continue;
      const referrerUser = await findOrCreateUserByAddress(referrer);
      const referredDbUser = await findOrCreateUserByAddress(referredUser);
      await prisma.referralPayout.upsert({
        where: { accrualTxHash: log.transactionHash },
        create: {
          userId: referrerUser.id,
          referredUserId: referredDbUser.id,
          epoch,
          amount: amount.toString(),
          accrualTxHash: log.transactionHash,
        },
        update: {},
      });
    }

    for (const log of referralClaimedLogs) {
      const { referrer } = log.args;
      if (!referrer) continue;
      const referrerUser = await findOrCreateUserByAddress(referrer);
      await prisma.referralPayout.updateMany({
        where: { userId: referrerUser.id, status: "ACCRUED" },
        data: { status: "CLAIMED", claimTxHash: log.transactionHash },
      });
    }

    await setCursor(address, toBlock);
    fromBlock = toBlock + 1n;
  }
}

/// Chain head minus a confirmation buffer, to absorb shallow reorgs.
async function safeChainTip(): Promise<bigint> {
  const latest = await publicClient.getBlockNumber();
  const confirmations = BigInt(env.INDEXER_CONFIRMATION_BLOCKS);
  return latest > confirmations ? latest - confirmations : 0n;
}

export async function runIndexerOnce(): Promise<void> {
  try {
    await indexStakingVault();
  } catch (err) {
    logger.error({ err }, "staking vault indexing failed");
  }
  try {
    await indexPredictionGame();
  } catch (err) {
    logger.error({ err }, "prediction game indexing failed");
  }
}
