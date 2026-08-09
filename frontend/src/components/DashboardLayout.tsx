import { Link, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { EpochTicker, type RoundOutcome } from "./EpochTicker";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePredictionContract } from "../hooks/usePredictionContract";
import { api } from "../lib/api";

const NAV = [
  { to: "/dashboard", label: "Overview" },
  { to: "/dashboard/prediction", label: "Prediction" },
  { to: "/dashboard/staking", label: "Staking" },
  { to: "/dashboard/leaderboard", label: "Leaderboard" },
  { to: "/dashboard/referrals", label: "Referrals" },
];

interface RoundData {
  lockPrice: string;
  closePrice: string;
  lockPriceSet: boolean;
  closePriceSet: boolean;
  cancelled: boolean;
}

function useRecentOutcomes(count = 30): RoundOutcome[] {
  const { currentEpoch } = usePredictionContract();
  const { data } = useQuery({
    queryKey: ["recent-outcomes", currentEpoch?.toString()],
    enabled: currentEpoch !== undefined && currentEpoch > 0n,
    queryFn: async () => {
      const epochs = Array.from(
        { length: count },
        (_, i) => (currentEpoch as bigint) - BigInt(i + 1),
      ).filter((e) => e > 0n);
      const rounds = await Promise.all(
        epochs.map(async (epoch) => {
          try {
            const { data } = await api.get<{ data: RoundData }>(
              `/api/prediction/rounds/${epoch}`,
            );
            return data.data;
          } catch {
            return null;
          }
        }),
      );
      return rounds.reverse().map((r): RoundOutcome => {
        if (!r || !r.closePriceSet) return "pending";
        if (r.cancelled) return "tie";
        const lock = BigInt(r.lockPrice);
        const close = BigInt(r.closePrice);
        if (close > lock) return "up";
        if (close < lock) return "down";
        return "tie";
      });
    },
  });
  return data ?? Array(count).fill("pending");
}

export function DashboardLayout() {
  const location = useLocation();
  const { data: me } = useCurrentUser();
  const outcomes = useRecentOutcomes();

  return (
    <div className="min-h-screen bg-base">
      <EpochTicker outcomes={outcomes} />
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            to="/dashboard"
            className="font-display text-lg font-semibold tracking-tight"
          >
            Predictron
          </Link>
          <nav className="flex gap-6">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm transition-colors ${
                  location.pathname === item.to
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {me?.role === "ADMIN" && (
              <Link
                to="/dashboard/admin"
                className={`text-sm transition-colors ${
                  location.pathname === "/dashboard/admin"
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <ConnectWalletButton />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
