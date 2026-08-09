import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { api } from "../lib/api";
import { useReferralContract } from "../hooks/useReferralContract";

interface ReferralSummary {
  referralCode: string;
  referredCount: number;
  referrals: { address: string; createdAt: string }[];
  pendingRewardWei: string;
  claimedRewardWei: string;
  payouts: {
    id: string;
    amount: string;
    status: "ACCRUED" | "CLAIMED";
    epoch: string | null;
    createdAt: string;
  }[];
}

export default function Referrals() {
  const { isConnected } = useAccount();
  const queryClient = useQueryClient();
  const {
    hasReferrer,
    myReferrer,
    pendingRewardWei,
    setReferrer,
    claimReferralReward,
    isPending,
    refetch,
  } = useReferralContract();
  const [referrerInput, setReferrerInput] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["referral-summary"],
    queryFn: async () =>
      (await api.get<{ data: ReferralSummary }>("/api/referrals/summary")).data
        .data,
  });

  const link = data
    ? `${window.location.origin}/?ref=${data.referralCode}`
    : "";

  async function handleSetReferrer() {
    setTxError(null);
    try {
      await setReferrer(referrerInput as `0x${string}`);
      refetch();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  async function handleClaim() {
    setTxError(null);
    try {
      await claimReferralReward();
      refetch();
      void queryClient.invalidateQueries({ queryKey: ["referral-summary"] });
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold">Referrals</h1>
        <p className="max-w-xl text-sm text-text-muted">
          Two separate things live on this page: your referral link (who signed
          up because of you) and your on-chain referrer registration (who you
          earn a reward from). Every reward accrual and claim below is a real
          contract event, not a database row — see PredictionGame.sol.
        </p>
      </div>

      {data && (
        <div className="max-w-md rounded-panel border border-border bg-panel p-5">
          <div className="text-xs uppercase tracking-widest text-text-faint">
            Your referral link
          </div>
          <div className="mt-2 break-all font-mono text-sm text-brand">
            {link}
          </div>
        </div>
      )}

      <div className="max-w-md rounded-panel border border-border bg-panel p-5">
        <div className="text-xs uppercase tracking-widest text-text-faint">
          On-chain referrer
        </div>
        {!isConnected ? (
          <p className="mt-2 text-sm text-text-muted">
            Connect a wallet to register a referrer.
          </p>
        ) : hasReferrer ? (
          <div className="mt-2 font-mono text-sm text-text-primary">
            {myReferrer}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm text-text-muted">
              Not set yet — this is permanent once you do, so it can&apos;t be
              reassigned later.
            </p>
            <input
              value={referrerInput}
              onChange={(e) => setReferrerInput(e.target.value)}
              placeholder="0x… referrer address"
              className="rounded-panel border border-border bg-base px-3 py-2 font-mono text-sm text-text-primary"
            />
            <button
              onClick={handleSetReferrer}
              disabled={isPending || !referrerInput}
              className="rounded-panel bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dim transition-colors disabled:opacity-50"
            >
              {isPending ? "Confirm in wallet…" : "Register referrer"}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-md rounded-panel border border-border bg-panel p-5">
        <div className="text-xs uppercase tracking-widest text-text-faint">
          Your referral rewards
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-sm text-text-muted">Claimable now</span>
          <span className="font-mono text-lg text-up">
            {pendingRewardWei ? formatEther(pendingRewardWei) : "0"} BNB
          </span>
        </div>
        {data && (
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-text-muted">Lifetime claimed</span>
            <span className="font-mono text-sm text-text-muted">
              {formatEther(BigInt(data.claimedRewardWei))} BNB
            </span>
          </div>
        )}
        <button
          onClick={handleClaim}
          disabled={isPending || !pendingRewardWei || pendingRewardWei === 0n}
          className="mt-4 w-full rounded-panel bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dim transition-colors disabled:opacity-50"
        >
          {isPending ? "Confirm in wallet…" : "Claim reward"}
        </button>
        {txError && <p className="mt-2 text-sm text-down">{txError}</p>}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Referred users ({data?.referredCount ?? 0})
        </h2>
        <ul className="flex flex-col gap-2 font-mono text-sm text-text-muted">
          {data?.referrals.map((r) => (
            <li key={r.address}>{r.address}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
