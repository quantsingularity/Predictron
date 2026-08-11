// Minimal ABIs: only the events/view functions the backend reads.

export const stakingVaultAbi = [
  {
    type: "event",
    name: "Staked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "positionId", type: "uint256", indexed: true },
      { name: "planId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "unlockTimestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Unstaked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "positionId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "rewardPaid", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "pendingReward",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const predictionGameAbi = [
  {
    type: "event",
    name: "RoundStarted",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "startTimestamp", type: "uint256", indexed: false },
      { name: "lockTimestamp", type: "uint256", indexed: false },
      { name: "closeTimestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RoundLocked",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "lockPrice", type: "int256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RoundClosed",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "closePrice", type: "int256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BetPlaced",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "epoch", type: "uint256", indexed: true },
      { name: "position", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "epoch", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ReferralRewardAccrued",
    inputs: [
      { name: "referrer", type: "address", indexed: true },
      { name: "referredUser", type: "address", indexed: true },
      { name: "epoch", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ReferralRewardClaimed",
    inputs: [
      { name: "referrer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "rounds",
    stateMutability: "view",
    inputs: [{ name: "epoch", type: "uint256" }],
    outputs: [
      { name: "epoch", type: "uint256" },
      { name: "startTimestamp", type: "uint256" },
      { name: "lockTimestamp", type: "uint256" },
      { name: "closeTimestamp", type: "uint256" },
      { name: "lockPrice", type: "int256" },
      { name: "closePrice", type: "int256" },
      { name: "lockPriceSet", type: "bool" },
      { name: "closePriceSet", type: "bool" },
      { name: "totalUpAmount", type: "uint256" },
      { name: "totalDownAmount", type: "uint256" },
      { name: "cancelled", type: "bool" },
    ],
  },
] as const;
