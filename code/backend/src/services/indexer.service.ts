import { publicClient } from "../lib/viemClient.js";
import { stakingVaultAbi, predictionGameAbi } from "../lib/abis.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { randomBytes } from "node:crypto";

const MAX_BLOCK_RANGE = 2000n; // starting point; shrinks automatically per fetchChunk below
const MIN_BLOCK_RANGE = 25n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

/// Fetches one chunk of logs via `fetchFn(fromBlock, toBlock)`, starting at
/// `maxRange` blocks wide. Many public RPC endpoints (the free BSC
/// dataseed nodes in particular) reject eth_getLogs above some
/// undocumented range or response-size limit that varies by provider, so
/// on any failure this halves the range and retries rather than failing
/// the whole indexing run. Returns the results plus the toBlock actually
/// reached, so the caller advances its cursor only as far as really
/// succeeded.
export async function fetchChunk<T>(
  fromBlock: bigint,
  safeTip: bigint,
  maxRange: bigint,
  fetchFn: (fromBlock: bigint, toBlock: bigint) => Promise<T>,
): Promise<{ result: T; toBlock: bigint; range: bigint }> {
  let range = maxRange;
  for (;;) {
    const toBlock = fromBlock + range > safeTip ? safeTip : fromBlock + range;
    try {
      const result = await fetchFn(fromBlock, toBlock);
      return { result, toBlock, range };
    } catch (err) {
      if (range <= MIN_BLOCK_RANGE) throw err;
      range = range / 2n > MIN_BLOCK_RANGE ? range / 2n : MIN_BLOCK_RANGE;
      logger.warn(
        { err, newRange: range.toString() },
        "getLogs failed, retrying with a smaller block range",
      );
    }
  }
}

/// Credits a stake only from a confirmed `Staked` event, never client input.
export async function indexStakingVault(): Promise<void> {
  const address = env.STAKING_VAULT_ADDRESS as `0x${string}`;
  if (address === ZERO_ADDRESS) {
    logger.warn(
      "STAKING_VAULT_ADDRESS is the zero address, skipping indexing until it's set to a deployed contract",
    );
    return;
  }
  const safeTip = await safeChainTip();
  let fromBlock =
    (await getCursor(address, env.STAKING_VAULT_DEPLOY_BLOCK)) + 1n;

  let range = MAX_BLOCK_RANGE;
  while (fromBlock <= safeTip) {
    const {
      result: [stakedLogs, unstakedLogs],
      toBlock,
      range: usedRange,
    } = await fetchChunk(fromBlock, safeTip, range, (from, to) =>
      Promise.all([
        publicClient.getContractEvents({
          address,
          abi: stakingVaultAbi,
          eventName: "Staked",
          fromBlock: from,
          toBlock: to,
        }),
        publicClient.getContractEvents({
          address,
          abi: stakingVaultAbi,
          eventName: "Unstaked",
          fromBlock: from,
          toBlock: to,
        }),
      ]),
    );
    range = usedRange;

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
  if (address === ZERO_ADDRESS) {
    logger.warn(
      "PREDICTION_GAME_ADDRESS is the zero address, skipping indexing until it's set to a deployed contract",
    );
    return;
  }
  const safeTip = await safeChainTip();
  let fromBlock =
    (await getCursor(address, env.PREDICTION_GAME_DEPLOY_BLOCK)) + 1n;

  let range = MAX_BLOCK_RANGE;
  while (fromBlock <= safeTip) {
    const {
      result: [betLogs, claimLogs, referralAccruedLogs, referralClaimedLogs],
      toBlock,
      range: usedRange,
    } = await fetchChunk(fromBlock, safeTip, range, (from, to) =>
      Promise.all([
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "BetPlaced",
          fromBlock: from,
          toBlock: to,
        }),
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "Claimed",
          fromBlock: from,
          toBlock: to,
        }),
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "ReferralRewardAccrued",
          fromBlock: from,
          toBlock: to,
        }),
        publicClient.getContractEvents({
          address,
          abi: predictionGameAbi,
          eventName: "ReferralRewardClaimed",
          fromBlock: from,
          toBlock: to,
        }),
      ]),
    );
    range = usedRange;

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
