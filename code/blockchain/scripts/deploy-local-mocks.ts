import { ethers } from "hardhat";

/// Local-dev only. Deploys a mock BUSD and a mock Chainlink feed, then
/// prints the exact env vars deploy.ts needs to deploy real contracts
/// against them, instead of the mainnet addresses deploy.ts defaults to
/// (which have no code on a plain, non-forked local Hardhat node).
async function main() {
  const Token = await ethers.getContractFactory("MockERC20");
  const token = await Token.deploy("Mock BUSD", "mBUSD");
  await token.waitForDeployment();

  const Feed = await ethers.getContractFactory("MockV3Aggregator");
  const feed = await Feed.deploy(8, 60_000_000_000n); // 8 decimals, $600.00
  await feed.waitForDeployment();

  const [deployer] = await ethers.getSigners();
  await (
    await token.mint(deployer.address, ethers.parseEther("1000000"))
  ).wait();

  console.log("\nMock BUSD deployed:", await token.getAddress());
  console.log("Mock price feed deployed:", await feed.getAddress());
  console.log("\nNow run:");
  console.log(
    `STAKING_TOKEN_ADDRESS=${await token.getAddress()} PRICE_FEED_ADDRESS=${await feed.getAddress()} npx hardhat run scripts/deploy.ts --network localhost`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
