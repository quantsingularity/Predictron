import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { api } from "../lib/api";

interface Position {
  status: "ACTIVE" | "UNSTAKED";
  amount: string;
}

interface ReferralSummary {
  referredCount: number;
}

const SHORTCUTS = [
  {
    to: "/dashboard/prediction",
    label: "Prediction",
    body: "View the live round and place a bet.",
  },
  {
    to: "/dashboard/staking",
    label: "Staking",
    body: "Open a new position or manage existing ones.",
  },
  {
    to: "/dashboard/referrals",
    label: "Referrals",
    body: "Share your link and track who's joined.",
  },
];

export default function Dashboard() {
  const { data: me } = useCurrentUser();

  const { data: positions } = useQuery({
    queryKey: ["staking-positions"],
    queryFn: async () =>
      (await api.get<{ data: Position[] }>("/api/staking/positions")).data.data,
  });

  const { data: referrals } = useQuery({
    queryKey: ["referral-summary"],
    queryFn: async () =>
      (await api.get<{ data: ReferralSummary }>("/api/referrals/summary")).data
        .data,
  });

  const activePositions =
    positions?.filter((p) => p.status === "ACTIVE").length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 font-mono text-sm text-text-muted">{me?.address}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-panel border border-border bg-panel p-5">
          <div className="text-xs uppercase tracking-widest text-text-faint">
            Active stakes
          </div>
          <div className="mt-2 font-mono text-3xl">{activePositions}</div>
        </div>
        <div className="rounded-panel border border-border bg-panel p-5">
          <div className="text-xs uppercase tracking-widest text-text-faint">
            Referred users
          </div>
          <div className="mt-2 font-mono text-3xl">
            {referrals?.referredCount ?? 0}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Go to</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="rounded-panel border border-border bg-panel p-5 transition-colors hover:border-brand"
            >
              <div className="font-display text-base font-semibold">
                {s.label}
              </div>
              <div className="mt-1 text-sm text-text-muted">{s.body}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
