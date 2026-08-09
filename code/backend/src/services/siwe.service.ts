import { SiweMessage, generateNonce } from "siwe";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.middleware.js";

/// Step 1 of login: issue a single-use nonce tied to the claimed address,
/// with a short expiry, per the SIWE spec. A fresh nonce per attempt means
/// a captured signature can never be replayed against a later request.
export async function issueNonce(address: string): Promise<string> {
  const nonce = generateNonce();
  await prisma.authNonce.create({
    data: {
      userAddress: address.toLowerCase(),
      nonce,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
  return nonce;
}

function makeReferralCode(): string {
  return randomBytes(4).toString("hex");
}

/// Step 2 of login: verify the signed SIWE message, consume the nonce,
/// find-or-create the user, and issue a short-lived session JWT. The JWT
/// only ever authorizes reading/writing this backend's own off-chain data
/// (profile, tickets, referral display) — it has no on-chain power
/// whatsoever. Every fund-moving action is still a transaction the user
/// signs directly with their own wallet against the contracts.
export async function verifySiweAndCreateSession(
  message: string,
  signature: string,
  referredByCode?: string,
): Promise<{ token: string; address: string }> {
  const siweMessage = new SiweMessage(message);

  let fields;
  try {
    fields = await siweMessage.verify({
      signature,
      domain: env.SIWE_DOMAIN,
    });
  } catch {
    throw new HttpError(401, "Signature verification failed");
  }

  const address = fields.data.address.toLowerCase();
  const nonce = fields.data.nonce;

  const storedNonce = await prisma.authNonce.findUnique({ where: { nonce } });
  if (
    !storedNonce ||
    storedNonce.userAddress !== address ||
    storedNonce.expiresAt < new Date()
  ) {
    throw new HttpError(401, "Nonce invalid, expired, or already used");
  }
  // Single-use: delete immediately so the same signed message can never be replayed.
  await prisma.authNonce.delete({ where: { nonce } });

  let user = await prisma.user.findUnique({ where: { address } });
  if (!user) {
    let referredById: string | undefined;
    if (referredByCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referredByCode },
      });
      referredById = referrer?.id;
    }
    user = await prisma.user.create({
      data: {
        address,
        referralCode: makeReferralCode(),
        ...(referredById ? { referredById } : {}),
      },
    });
  }

  const token = jwt.sign(
    { sub: user.id, address: user.address } satisfies Record<string, unknown>,
    env.SESSION_JWT_SECRET,
    {
      expiresIn: `${env.SESSION_TTL_HOURS}h`,
    },
  );

  return { token, address: user.address };
}
