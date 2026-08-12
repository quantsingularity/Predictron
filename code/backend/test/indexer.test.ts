import { describe, it, expect, vi } from "vitest";

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {},
}));

const { fetchChunk } = await import("../src/services/indexer.service.js");

describe("fetchChunk", () => {
  it("uses the full requested range when the fetch succeeds first try", async () => {
    const fetchFn = vi.fn().mockResolvedValue("logs");
    const { result, toBlock, range } = await fetchChunk(
      100n,
      10_000n,
      2000n,
      fetchFn,
    );

    expect(result).toBe("logs");
    expect(toBlock).toBe(2100n);
    expect(range).toBe(2000n);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith(100n, 2100n);
  });

  it("caps toBlock at safeTip rather than overshooting it", async () => {
    const fetchFn = vi.fn().mockResolvedValue("logs");
    const { toBlock } = await fetchChunk(9000n, 9500n, 2000n, fetchFn);

    expect(toBlock).toBe(9500n);
    expect(fetchFn).toHaveBeenCalledWith(9000n, 9500n);
  });

  it("halves the range and retries on failure, and carries the smaller range forward", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("limit exceeded"))
      .mockRejectedValueOnce(new Error("limit exceeded"))
      .mockResolvedValueOnce("logs");

    const { result, range } = await fetchChunk(0n, 10_000n, 2000n, fetchFn);

    expect(result).toBe("logs");
    expect(range).toBe(500n); // 2000 -> 1000 -> 500
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn).toHaveBeenNthCalledWith(1, 0n, 2000n);
    expect(fetchFn).toHaveBeenNthCalledWith(2, 0n, 1000n);
    expect(fetchFn).toHaveBeenNthCalledWith(3, 0n, 500n);
  });

  it("shrinks down to exactly the minimum range and succeeds there", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("limit exceeded")) // range 100
      .mockRejectedValueOnce(new Error("limit exceeded")) // range 50
      .mockResolvedValueOnce("logs"); // range 25 (the floor)

    const { result, range } = await fetchChunk(0n, 10_000n, 100n, fetchFn);

    expect(result).toBe("logs");
    expect(range).toBe(25n); // 100 -> 50 -> floors at 25 (MIN_BLOCK_RANGE)
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("gives up rather than retrying forever once already at the minimum range", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("limit exceeded")) // range 100
      .mockRejectedValueOnce(new Error("limit exceeded")) // range 50
      .mockRejectedValueOnce(new Error("still failing at the floor")); // range 25, floor, no further retry

    await expect(fetchChunk(0n, 10_000n, 100n, fetchFn)).rejects.toThrow(
      "still failing at the floor",
    );
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
