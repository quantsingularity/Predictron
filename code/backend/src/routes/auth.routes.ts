import { Router } from "express";
import { z } from "zod";
import {
  issueNonce,
  verifySiweAndCreateSession,
} from "../services/siwe.service.js";
import {
  requireAuth,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

export const authRouter = Router();

const NonceRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address"),
});

authRouter.post("/nonce", async (req, res, next) => {
  try {
    const { address } = NonceRequestSchema.parse(req.body);
    const nonce = await issueNonce(address);
    res.json({ success: true, nonce });
  } catch (err) {
    next(err);
  }
});

const VerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  referralCode: z.string().optional(),
});

/// Sets the session as an httpOnly cookie rather than returning the JWT in
/// the response body. The frontend never sees or stores the token itself.
/// It just gets a plain "you're logged in as this address" confirmation,
/// and every subsequent request carries the cookie automatically.
authRouter.post("/verify", async (req, res, next) => {
  try {
    const { message, signature, referralCode } = VerifySchema.parse(req.body);
    const { token, address } = await verifySiweAndCreateSession(
      message,
      signature,
      referralCode,
    );
    res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    res.json({ success: true, address });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
  res.json({ success: true });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: {
        id: true,
        address: true,
        role: true,
        referralCode: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});
