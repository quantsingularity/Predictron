import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useStakingContract } from "../hooks/useStakingContract";
import { api } from "../lib/api";

interface Position {
  id: string;
  chainPositionId: string;
  planId: string;
  amount: string;
  status: "ACTIVE" | "UNSTAKED";
  unlockTimestamp: string | null;
  pendingReward?: string;
}

export default function Staking() {
  const { allowance, approve, stake, unstake, claimReward, isPending } =
    useStakingContract();
  const [planId, setPlanId] = useState("1");
  const [amount, setAmount] = useState("100");

  const { data: positions, refetch } = useQuery({
    queryKey: ["staking-positions"],
    queryFn: async () =>
      (await api.get<{ data: Position[] }>("/api/staking/positions")).data.data,
    refetchInterval: 15000,
  });

  const amountWei = amount ? parseEther(amount) : 0n;
  const needsApproval = allowance < amountWei;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold">Staking</h1>
        <p className="max-w-xl text-sm text-text-muted">
          Stake directly into the vault contract. Your tokens sit in the
          contract, not a backend-controlled wallet — you unstake with your own
          transaction whenever your plan unlocks.
        </p>
      </div>

      <div className="flex max-w-md flex-col gap-3 rounded-panel border border-border bg-panel p-5">
        <label className="text-xs uppercase tracking-widest text-text-faint">
          Plan ID
        </label>
        <input
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="rounded bg-panel-raised px-3 py-2 font-mono text-sm outline-none focus-visible:outline-brand"
        />
        <label className="text-xs uppercase tracking-widest text-text-faint">
          Amount
        </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded bg-panel-raised px-3 py-2 font-mono text-sm outline-none focus-visible:outline-brand"
        />
        {needsApproval ? (
          <button
            disabled={isPending}
            onClick={() => approve(amountWei)}
            className="rounded-panel bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dim transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={async () => {
              await stake(BigInt(planId), amountWei);
              refetch();
            }}
            className="rounded-panel bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dim transition-colors disabled:opacity-50"
          >
            Stake
          </button>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">
          Your positions
        </h2>
        <div className="overflow-hidden rounded-panel border border-border">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-panel-raised text-xs uppercase tracking-widest text-text-faint">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pending reward</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(positions ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">{p.planId}</td>
                  <td className="px-4 py-3">{formatEther(BigInt(p.amount))}</td>
                  <td className="px-4 py-3 text-text-muted">{p.status}</td>
                  <td className="px-4 py-3">
                    {p.pendingReward
                      ? formatEther(BigInt(p.pendingReward))
                      : "—"}
                  </td>
                  <td className="flex gap-2 px-4 py-3">
                    {p.status === "ACTIVE" && (
                      <>
                        <button
                          onClick={() => claimReward(BigInt(p.chainPositionId))}
                          className="text-brand hover:underline"
                        >
                          Claim
                        </button>
                        <button
                          onClick={async () => {
                            await unstake(BigInt(p.chainPositionId));
                            refetch();
                          }}
                          className="text-text-muted hover:text-text-primary"
                        >
                          Unstake
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {(!positions || positions.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-text-muted"
                  >
                    No positions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
