// Runs before every test file. config/env.ts validates process.env at
// import time, so anything that transitively imports it (prisma.ts,
// auth.middleware.ts, app.ts, ...) needs these present first.
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??=
  "postgresql://user:password@localhost:5432/predictron_test";
process.env.RPC_URL ??= "http://127.0.0.1:8545";
process.env.CHAIN_ID ??= "31337";
process.env.STAKING_VAULT_ADDRESS ??=
  "0x1111111111111111111111111111111111111111";
process.env.PREDICTION_GAME_ADDRESS ??=
  "0x2222222222222222222222222222222222222222";
process.env.REFERRAL_REGISTRY_ADDRESS ??=
  "0x3333333333333333333333333333333333333333";
process.env.STAKING_VAULT_DEPLOY_BLOCK ??= "0";
process.env.PREDICTION_GAME_DEPLOY_BLOCK ??= "0";
process.env.SESSION_JWT_SECRET ??=
  "test-only-secret-do-not-use-in-production-32chars";
process.env.SESSION_TTL_HOURS ??= "24";
process.env.SIWE_DOMAIN ??= "test.local";
process.env.SIWE_URI ??= "http://test.local";
process.env.CORS_ORIGIN ??= "http://test.local";
