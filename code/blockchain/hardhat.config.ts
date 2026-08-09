import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Deployer key is read from the environment only, never hard-coded and
// never sent anywhere over the network by this repo's own code.
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    bscTestnet: {
      url:
        process.env.BSC_TESTNET_RPC_URL ??
        "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },
    bsc: {
      url:
        process.env.BSC_MAINNET_RPC_URL ?? "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};

export default config;
