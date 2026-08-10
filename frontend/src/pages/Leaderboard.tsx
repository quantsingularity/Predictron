import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { api } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface LeaderboardEntry {
  rank: number;
  address: string;
  netWinnings: string;
  wins: number;
  totalBets: number;
  winRate: number;
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Leaderboard() {
  const { data: me } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () =>
      (
        await api.get<{ data: LeaderboardEntry[] }>(
          "/api/prediction/leaderboard",
        )
      ).data.data,
    staleTime: 30_000,
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold">
          Leaderboard
        </h1>
        <p className="max-w-xl text-sm text-text-muted">
          Ranked by net winnings across every resolved prediction round,
          computed entirely from BetPlaced and Claimed events on-chain, not a
          score anyone can edit.
        </p>
      </div>

      <div className="overflow-hidden rounded-panel border border-border">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-panel-raised text-xs uppercase tracking-widest text-text-faint">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Net winnings</th>
              <th className="px-4 py-3">Win rate</th>
              <th className="px-4 py-3">Bets</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-text-muted" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr>
                <td className="px-4 py-6 text-text-muted" colSpan={5}>
                  No resolved bets yet.
                </td>
              </tr>
            )}
            {data?.map((entry) => {
              const isMe =
                me && entry.address.toLowerCase() === me.address.toLowerCase();
              const net = BigInt(entry.netWinnings);
              return (
                <tr
                  key={entry.address}
                  className={`border-t border-border ${isMe ? "bg-panel-raised" : ""}`}
                >
                  <td className="px-4 py-3 text-text-muted">#{entry.rank}</td>
                  <td className="px-4 py-3">
                    {shortAddress(entry.address)}
                    {isMe && (
                      <span className="ml-2 text-xs text-brand">you</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${net >= 0n ? "text-up" : "text-down"}`}
                  >
                    {net >= 0n ? "+" : ""}
                    {formatEther(net)} BNB
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {entry.winRate}%
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {entry.totalBets}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
