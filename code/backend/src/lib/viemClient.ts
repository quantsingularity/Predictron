import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { env } from "../config/env.js";

// PublicClient only, no private key held anywhere in this backend.
export const publicClient = createPublicClient({
  chain: { ...bsc, id: env.CHAIN_ID },
  transport: http(env.RPC_URL),
});
