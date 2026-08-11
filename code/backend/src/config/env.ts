import "dotenv/config";
import { z } from "zod";

// Fails fast at boot if any required env var is missing or malformed.
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1),

  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),

  STAKING_VAULT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  PREDICTION_GAME_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  REFERRAL_REGISTRY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  STAKING_VAULT_DEPLOY_BLOCK: z.coerce.bigint(),
  PREDICTION_GAME_DEPLOY_BLOCK: z.coerce.bigint(),

  // Reorg safety buffer; blocks to stay behind the chain head.
  INDEXER_CONFIRMATION_BLOCKS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(15),

  SESSION_JWT_SECRET: z
    .string()
    .min(32, "SESSION_JWT_SECRET must be at least 32 chars"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),

  SIWE_DOMAIN: z.string().min(1),
  SIWE_URI: z.string().url(),

  CORS_ORIGIN: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),

  // Optional; absent just means no AI signal available.
  AI_SERVICE_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
