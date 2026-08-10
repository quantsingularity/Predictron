import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { referralRegistryAbi, predictionGameAbi } from "../lib/abis";
import {
  REFERRAL_REGISTRY_ADDRESS,
  PREDICTION_GAME_ADDRESS,
} from "../lib/wagmi";

export function useReferralContract() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const myReferrer = useReadContract({
    address: REFERRAL_REGISTRY_ADDRESS,
    abi: referralRegistryAbi,
    functionName: "getReferrer",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const pendingReward = useReadContract({
    address: PREDICTION_GAME_ADDRESS,
    abi: predictionGameAbi,
    functionName: "pendingReferralReward",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const hasReferrer = Boolean(
    myReferrer.data &&
    myReferrer.data !== "0x0000000000000000000000000000000000000000",
  );

  /// Register `referrer` as the connected wallet's referrer, on-chain,
  /// one time. This is a real transaction the user signs themselves,
  /// there's no backend step that could fail to reflect it.
  async function setReferrer(referrer: `0x${string}`) {
    return writeContractAsync({
      address: REFERRAL_REGISTRY_ADDRESS,
      abi: referralRegistryAbi,
      functionName: "setReferrer",
      args: [referrer],
    });
  }

  /// Withdraw everything accrued so far from referred users' winning
  /// claims. Separate from any of their claims by design, see
  /// PredictionGame.sol's comment on pendingReferralReward.
  async function claimReferralReward() {
    return writeContractAsync({
      address: PREDICTION_GAME_ADDRESS,
      abi: predictionGameAbi,
      functionName: "claimReferralReward",
    });
  }

  return {
    myReferrer: myReferrer.data,
    hasReferrer,
    pendingRewardWei: pendingReward.data,
    setReferrer,
    claimReferralReward,
    isPending,
    refetch: () => {
      void myReferrer.refetch();
      void pendingReward.refetch();
    },
  };
}
