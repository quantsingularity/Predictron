import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { erc20Abi, stakingVaultAbi } from "../lib/abis";
import { STAKING_VAULT_ADDRESS, STAKING_TOKEN_ADDRESS } from "../lib/wagmi";

/// Every function here submits a transaction signed by the connected
/// wallet via wagmi's useWriteContract, the backend is never in this
/// call path and could not intercept or redirect the funds even if it
/// wanted to.
export function useStakingContract() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const allowance = useReadContract({
    address: STAKING_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, STAKING_VAULT_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  });

  async function approve(amount: bigint) {
    return writeContractAsync({
      address: STAKING_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [STAKING_VAULT_ADDRESS, amount],
    });
  }

  async function stake(planId: bigint, amount: bigint) {
    return writeContractAsync({
      address: STAKING_VAULT_ADDRESS,
      abi: stakingVaultAbi,
      functionName: "stake",
      args: [planId, amount],
    });
  }

  async function unstake(positionId: bigint) {
    return writeContractAsync({
      address: STAKING_VAULT_ADDRESS,
      abi: stakingVaultAbi,
      functionName: "unstake",
      args: [positionId],
    });
  }

  async function claimReward(positionId: bigint) {
    return writeContractAsync({
      address: STAKING_VAULT_ADDRESS,
      abi: stakingVaultAbi,
      functionName: "claimReward",
      args: [positionId],
    });
  }

  return {
    allowance: allowance.data ?? 0n,
    approve,
    stake,
    unstake,
    claimReward,
    isPending,
  };
}
