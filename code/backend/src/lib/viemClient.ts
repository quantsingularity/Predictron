import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { env } from "../config/env.js";

// Deliberately a PublicClient only — there is no WalletClient anywhere in
// this backend, and therefore no private key for it to hold. It reads
// chain state and event logs; it cannot sign or broadcast a transaction.
export const publicClient = createPublicClient({
  chain: { ...bsc, id: env.CHAIN_ID },
  transport: http(env.RPC_URL),
});
