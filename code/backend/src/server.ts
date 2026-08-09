import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startChainIndexer } from "./jobs/chainIndexer.job.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "predictron backend listening");
  startChainIndexer();
});
