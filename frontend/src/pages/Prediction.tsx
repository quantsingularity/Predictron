import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { usePredictionContract } from "../hooks/usePredictionContract";
import { api } from "../lib/api";

interface RoundData {
  epoch: string;
  lockTimestamp: string;
  closeTimestamp: string;
  lockPrice: string;
  closePrice: string;
  lockPriceSet: boolean;
  closePriceSet: boolean;
  totalUpAmount: string;
  totalDownAmount: string;
  cancelled: boolean;
}

function RoundCard({ epoch, label }: { epoch: bigint; label: string }) {
  const { placeBet, isPending } = usePredictionContract();
  const [amount, setAmount] = useState("0.01");

  const { data: round, isLoading } = useQuery({
    queryKey: ["round", epoch.toString()],
    queryFn: async () =>
      (await api.get<{ data: RoundData }>(`/api/prediction/rounds/${epoch}`))
        .data.data,
    enabled: epoch > 0n,
    refetchInterval: 5000,
  });

  const pool =
    round && BigInt(round.totalUpAmount) + BigInt(round.totalDownAmount) > 0n
      ? formatEther(BigInt(round.totalUpAmount) + BigInt(round.totalDownAmount))
      : "0";

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 rounded-panel border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-text-faint">
          {label}
        </span>
        <span className="font-mono text-xs text-text-muted">
          #{epoch.toString()}
        </span>
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded bg-panel-raised" />
      ) : (
        <>
          <div className="font-mono text-2xl font-medium">{pool} BNB pool</div>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs text-text-muted">
            <span className="text-up">
              Up {round ? formatEther(BigInt(round.totalUpAmount)) : "0"}
            </span>
            <span className="text-right text-down">
              Down {round ? formatEther(BigInt(round.totalDownAmount)) : "0"}
            </span>
          </div>
        </>
      )}

      {label === "Live" && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <input
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded bg-panel-raised px-3 py-2 font-mono text-sm outline-none focus-visible:outline-brand"
            aria-label="Bet amount in BNB"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={isPending}
              onClick={() => placeBet(epoch, 1, parseEther(amount || "0"))}
              className="rounded-panel bg-up/90 py-2 text-sm font-medium text-base hover:bg-up transition-colors disabled:opacity-50"
            >
              Up
            </button>
            <button
              disabled={isPending}
              onClick={() => placeBet(epoch, 0, parseEther(amount || "0"))}
              className="rounded-panel bg-down/90 py-2 text-sm font-medium text-base hover:bg-down transition-colors disabled:opacity-50"
            >
              Down
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Prediction() {
  const { currentEpoch } = usePredictionContract();

  if (currentEpoch === undefined) {
    return <p className="text-text-muted">Loading round state from chain…</p>;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Prediction</h1>
      <p className="mb-6 max-w-xl text-sm text-text-muted">
        Each round&apos;s lock and close price is read from Chainlink by the
        contract itself. Bets are escrowed on-chain — winners claim their own
        payout, nobody approves it for them.
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <RoundCard epoch={currentEpoch - 1n} label="Prev" />
        <RoundCard epoch={currentEpoch} label="Live" />
        <RoundCard epoch={currentEpoch + 1n} label="Next" />
      </div>
    </div>
  );
}
