// Same contracts as backend/src/lib/abis.ts, but this copy also includes
// the state-changing functions — because here, unlike the backend, it's
// correct for the ABI to include write functions: the *user's own wallet*
// is what will sign and submit them.

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const stakingVaultAbi = [
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "planId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "positionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "unstake",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimReward",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const predictionGameAbi = [
  {
    type: "function",
    name: "bet",
    stateMutability: "payable",
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "position", type: "uint8" }, // 0 = Down, 1 = Up
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "epoch", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "currentEpoch",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "pendingReferralReward",
    stateMutability: "view",
    inputs: [{ name: "referrer", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "claimReferralReward",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const referralRegistryAbi = [
  {
    type: "function",
    name: "setReferrer",
    stateMutability: "nonpayable",
    inputs: [{ name: "referrer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getReferrer",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "address" }],
  },
] as const;
