import { createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined;

export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [
    injected(), // MetaMask and other injected wallets
    coinbaseWallet({ appName: "Predictron" }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
  transports: {
    [bsc.id]: http(import.meta.env.VITE_RPC_URL as string),
  },
});

export const STAKING_VAULT_ADDRESS = import.meta.env
  .VITE_STAKING_VAULT_ADDRESS as `0x${string}`;
export const PREDICTION_GAME_ADDRESS = import.meta.env
  .VITE_PREDICTION_GAME_ADDRESS as `0x${string}`;
export const REFERRAL_REGISTRY_ADDRESS = import.meta.env
  .VITE_REFERRAL_REGISTRY_ADDRESS as `0x${string}`;
export const STAKING_TOKEN_ADDRESS = import.meta.env
  .VITE_STAKING_TOKEN_ADDRESS as `0x${string}`;
