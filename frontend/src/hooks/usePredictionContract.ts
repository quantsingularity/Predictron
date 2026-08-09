import { useWriteContract, useReadContract } from "wagmi";
import { predictionGameAbi } from "../lib/abis";
import { PREDICTION_GAME_ADDRESS } from "../lib/wagmi";

export function usePredictionContract() {
  const { writeContractAsync, isPending } = useWriteContract();

  const currentEpoch = useReadContract({
    address: PREDICTION_GAME_ADDRESS,
    abi: predictionGameAbi,
    functionName: "currentEpoch",
  });

  async function placeBet(epoch: bigint, position: 0 | 1, amountWei: bigint) {
    return writeContractAsync({
      address: PREDICTION_GAME_ADDRESS,
      abi: predictionGameAbi,
      functionName: "bet",
      args: [epoch, position],
      value: amountWei,
    });
  }

  async function claim(epoch: bigint) {
    return writeContractAsync({
      address: PREDICTION_GAME_ADDRESS,
      abi: predictionGameAbi,
      functionName: "claim",
      args: [epoch],
    });
  }

  return { currentEpoch: currentEpoch.data, placeBet, claim, isPending };
}
