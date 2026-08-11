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

/// Public, best-effort: a 200 with `data: null` means no signal available.
aiRouter.post("/price-direction", async (req, res, next) => {
  try {
    const { candles } = RequestSchema.parse(req.body);
    const signal = await getPriceDirectionSignal(candles);
    res.json({ success: true, data: signal });
  } catch (err) {
    next(err);
  }
});
