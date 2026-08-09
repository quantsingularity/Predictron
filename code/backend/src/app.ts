import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import {
  authRateLimit,
  apiRateLimit,
} from "./middleware/rateLimit.middleware.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";

import { authRouter } from "./routes/auth.routes.js";
import { stakingRouter } from "./routes/staking.routes.js";
import { predictionRouter } from "./routes/prediction.routes.js";
import { referralRouter } from "./routes/referral.routes.js";
import { ticketRouter } from "./routes/ticket.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { aiRouter } from "./routes/ai.routes.js";

export function createApp() {
  const app = express();

  // CORS is locked to the configured frontend origin only, never a
  // wildcard, since requests carry credentials (the session cookie).
  app.use(helmet());
  app.use(cookieParser());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" })); // small body cap on every request
  app.use(pinoHttp({ logger }));

  app.get("/api/health", (_req, res) =>
    res.json({ success: true, status: "ok" }),
  );

  app.use("/api/auth", authRateLimit, authRouter);
  app.use("/api/staking", apiRateLimit, stakingRouter);
  app.use("/api/prediction", apiRateLimit, predictionRouter);
  app.use("/api/referrals", apiRateLimit, referralRouter);
  app.use("/api/tickets", apiRateLimit, ticketRouter);
  app.use("/api/admin", apiRateLimit, adminRouter);
  app.use("/api/ai", apiRateLimit, aiRouter);

  // Deliberately no webhook routes. Balance-affecting facts come only from
  // the chain indexer reading contract event logs (see
  // services/indexer.service.ts) — there is nothing here for an
  // unauthenticated POST to forge.

  app.use((req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
  });

  app.use(errorHandler);

  return app;
}
