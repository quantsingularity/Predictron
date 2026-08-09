export interface ResolvedBetInput {
  userId: string;
  address: string;
  amount: string; // wei-precision decimal string
  payout: string; // wei-precision decimal string
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  netWinnings: string; // wei-precision decimal string, may be negative
  wins: number;
  totalBets: number;
  winRate: number; // 0-100, one decimal place
}

/// Aggregates resolved bets into a ranked leaderboard. Pure and
/// side-effect free so it can be unit tested without a database — the
/// route handler is just "fetch resolved bets, call this, respond".
export function computeLeaderboard(
  bets: ResolvedBetInput[],
  limit = 20,
): LeaderboardEntry[] {
  const byUser = new Map<
    string,
    { address: string; net: bigint; wins: number; totalBets: number }
  >();

  for (const bet of bets) {
    const amount = BigInt(bet.amount);
    const payout = BigInt(bet.payout);
    const entry = byUser.get(bet.userId) ?? {
      address: bet.address,
      net: 0n,
      wins: 0,
      totalBets: 0,
    };
    entry.net += payout - amount;
    entry.totalBets += 1;
    if (payout > amount) entry.wins += 1;
    byUser.set(bet.userId, entry);
  }

  return [...byUser.values()]
    .sort((a, b) => (b.net > a.net ? 1 : b.net < a.net ? -1 : 0))
    .slice(0, limit)
    .map((entry, i) => ({
      rank: i + 1,
      address: entry.address,
      netWinnings: entry.net.toString(),
      wins: entry.wins,
      totalBets: entry.totalBets,
      winRate:
        entry.totalBets > 0
          ? Number(((entry.wins / entry.totalBets) * 100).toFixed(1))
          : 0,
    }));
}
