import { runIndexerOnce } from "../services/indexer.service.js";
import { logger } from "../lib/logger.js";

const POLL_INTERVAL_MS = 15_000;

let running = false;

export function startChainIndexer(): void {
  setInterval(() => {
    if (running) return; // don't overlap runs if one tick is slow
    running = true;
    runIndexerOnce()
      .catch((err) => logger.error({ err }, "indexer tick failed"))
      .finally(() => {
        running = false;
      });
  }, POLL_INTERVAL_MS);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "chain indexer started");
}
