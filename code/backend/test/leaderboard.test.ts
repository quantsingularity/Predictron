import { describe, it, expect } from "vitest";
import { computeLeaderboard } from "../src/lib/leaderboard.js";

describe("computeLeaderboard", () => {
  it("ranks users by net winnings, highest first", () => {
    const result = computeLeaderboard([
      { userId: "u1", address: "0xAAA", amount: "100", payout: "150" }, // net +50
      { userId: "u2", address: "0xBBB", amount: "100", payout: "300" }, // net +200
      { userId: "u3", address: "0xCCC", amount: "100", payout: "0" }, // net -100
    ]);

    expect(result.map((r) => r.address)).toEqual(["0xBBB", "0xAAA", "0xCCC"]);
    expect(result[0]).toMatchObject({
      rank: 1,
      netWinnings: "200",
      wins: 1,
      totalBets: 1,
      winRate: 100,
    });
    expect(result[2]).toMatchObject({
      rank: 3,
      netWinnings: "-100",
      wins: 0,
      totalBets: 1,
      winRate: 0,
    });
  });

  it("aggregates multiple bets from the same user into one entry", () => {
    const result = computeLeaderboard([
      { userId: "u1", address: "0xAAA", amount: "100", payout: "150" }, // win, net +50
      { userId: "u1", address: "0xAAA", amount: "100", payout: "0" }, // loss, net -100
      { userId: "u1", address: "0xAAA", amount: "100", payout: "100" }, // tie, net 0
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      netWinnings: "-50", // +50 - 100 + 0
      wins: 1,
      totalBets: 3,
      winRate: 33.3,
    });
  });

  it("handles amounts far beyond Number.MAX_SAFE_INTEGER without precision loss", () => {
    const huge = "123456789012345678901234567890";
    const result = computeLeaderboard([
      { userId: "u1", address: "0xAAA", amount: "0", payout: huge },
    ]);
    expect(result[0]!.netWinnings).toBe(huge);
  });

  it("respects the limit and truncates lower-ranked entries", () => {
    const bets = Array.from({ length: 5 }, (_, i) => ({
      userId: `u${i}`,
      address: `0x${i}`,
      amount: "100",
      payout: String(100 + i), // increasing net winnings
    }));
    const result = computeLeaderboard(bets, 2);
    expect(result).toHaveLength(2);
    expect(result[0]!.address).toBe("0x4"); // highest net winnings
    expect(result[1]!.address).toBe("0x3");
  });

  it("returns an empty leaderboard for no resolved bets", () => {
    expect(computeLeaderboard([])).toEqual([]);
  });

  it("gives a 0 win rate a user who has bet but never won, not NaN or a crash", () => {
    const result = computeLeaderboard([
      { userId: "u1", address: "0xAAA", amount: "100", payout: "0" },
    ]);
    expect(result[0]!.winRate).toBe(0);
  });
});
