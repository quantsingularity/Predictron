import { ethers } from "hardhat";

// BSC mainnet addresses, override via env for testnet.
const BUSD_MAINNET =
  process.env.STAKING_TOKEN_ADDRESS ??
  "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
const BNB_USD_FEED_MAINNET =
  process.env.PRICE_FEED_ADDRESS ??
  "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"; // Chainlink BNB/USD

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Owner should be a multisig/timelock in production, pass via env.
  const owner = process.env.CONTRACT_OWNER_ADDRESS ?? deployer.address;

  const StakingVault = await ethers.getContractFactory("StakingVault");
  const vault = await StakingVault.deploy(BUSD_MAINNET, BUSD_MAINNET, owner);
  await vault.waitForDeployment();
  console.log("StakingVault deployed:", await vault.getAddress());

  const ReferralRegistry = await ethers.getContractFactory("ReferralRegistry");
  const registry = await ReferralRegistry.deploy();
  await registry.waitForDeployment();
  console.log("ReferralRegistry deployed:", await registry.getAddress());

  const PredictionGame = await ethers.getContractFactory("PredictionGame");
  const roundDuration = 5 * 60; // 5 minutes per round
  const game = await PredictionGame.deploy(
    BNB_USD_FEED_MAINNET,
    await registry.getAddress(),
    roundDuration,
    owner,
  );
  await game.waitForDeployment();
  console.log("PredictionGame deployed:", await game.getAddress());

  console.log("\nAdd these to backend/.env and frontend/.env:");
  console.log(`STAKING_VAULT_ADDRESS=${await vault.getAddress()}`);
  console.log(`REFERRAL_REGISTRY_ADDRESS=${await registry.getAddress()}`);
  console.log(`PREDICTION_GAME_ADDRESS=${await game.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
