import { Router } from "express";
import { z } from "zod";
import { getPriceDirectionSignal } from "../services/aiSignals.service.js";

export const aiRouter = Router();

const CandleSchema = z.object({
  timestamp: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

const RequestSchema = z.object({
  candles: z.array(CandleSchema).min(20),
});

/// Intentionally public (no requireAuth) and intentionally best-effort: a
/// 200 with `data: null` is a completely normal, expected response when
/// the AI service is offline or untrained. The frontend integration point
/// for real market-data candles (e.g. an exchange's public klines API)
/// lives wherever this route is called from — see code/ai_services/README.md for
/// the trust boundary this maintains.
aiRouter.post("/price-direction", async (req, res, next) => {
  try {
    const { candles } = RequestSchema.parse(req.body);
    const signal = await getPriceDirectionSignal(candles);
    res.json({ success: true, data: signal });
  } catch (err) {
    next(err);
  }
});
