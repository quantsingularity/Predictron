import "dotenv/config";
import { z } from "zod";

// Validate all environment variables up front. If something required is
// missing or malformed, the process refuses to start rather than failing
// unpredictably partway through a request.
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

  // Blocks to stay behind the chain head before indexing a block, so a
  // shallow reorg can never cause an event to be indexed and later
  // silently disappear. ~15 blocks is a few minutes on BSC; tune per chain.
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

  // Optional: URL of code/ai_services/inference_api. Absent or unreachable
  // simply means "no AI signal available", never a fatal boot condition.
  AI_SERVICE_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
