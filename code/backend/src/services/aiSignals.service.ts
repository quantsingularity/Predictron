import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/// Calls the Python inference service for an advisory probability.
/// Fails soft: returns `null` if the service is down or untrained.
export async function getPriceDirectionSignal(
  candles: Candle[],
): Promise<{ probabilityUp: number; modelVersion: string } | null> {
  if (!env.AI_SERVICE_URL) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // short timeout, this is a nice-to-have, not a blocking dependency
    const res = await fetch(`${env.AI_SERVICE_URL}/predict/price-direction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candles }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      probability_up: number;
      model_version: string;
    };
    return {
      probabilityUp: data.probability_up,
      modelVersion: data.model_version,
    };
  } catch (err) {
    logger.warn(
      { err },
      "AI price-direction signal unavailable, continuing without it",
    );
    return null;
  }
}
