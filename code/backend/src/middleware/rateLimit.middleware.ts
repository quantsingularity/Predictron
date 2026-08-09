import rateLimit from "express-rate-limit";

// Applied selectively in app.ts: a strict window on auth (brute-force /
// nonce-spam resistant) and a looser general window on everything else.

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth attempts, try again later",
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests" },
});
