import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const YEAR = 365 * 24 * 60 * 60;

describe("StakingVault", () => {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy("Mock BUSD", "mBUSD");

    const Vault = await ethers.getContractFactory("StakingVault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      await token.getAddress(),
      owner.address,
    );

    await token.mint(alice.address, ethers.parseEther("10000"));
    await token.mint(bob.address, ethers.parseEther("10000"));
    await token.mint(owner.address, ethers.parseEther("10000"));

    // 10% annualized reward, no lock, for straightforward math in tests
    const tx = await vault.connect(owner).createPlan(0, 1000);
    await tx.wait();
    const planId = 1n;

    return { vault, token, owner, alice, bob, planId };
  }

  it("rejects a zero address in the constructor", async () => {
    const [owner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy("Mock BUSD", "mBUSD");
    const Vault = await ethers.getContractFactory("StakingVault");
    await expect(
      Vault.deploy(ethers.ZeroAddress, await token.getAddress(), owner.address),
    ).to.be.revertedWithCustomError(Vault, "ZeroAddress");
  });

  it("stakes, accrues reward over time, and pays out on unstake", async () => {
    const { vault, token, alice, planId } = await loadFixture(deployFixture);
    const amount = ethers.parseEther("1000");

    await token.connect(alice).approve(await vault.getAddress(), amount);
    await expect(vault.connect(alice).stake(planId, amount))
      .to.emit(vault, "Staked")
      .withArgs(alice.address, 0n, planId, amount, 0n);

    // fund the reward reserve generously so payout isn't capped
    await token.approve(await vault.getAddress(), ethers.parseEther("1000"));
    await vault.fundRewards(ethers.parseEther("1000"));

    await time.increase(YEAR / 2); // half a year at 10% APR ~= 5% of principal

    const balBefore = await token.balanceOf(alice.address);
    await vault.connect(alice).unstake(0);
    const balAfter = await token.balanceOf(alice.address);

    const received = balAfter - balBefore;
    const expectedReward =
      (amount * 1000n * BigInt(YEAR / 2)) / (10_000n * BigInt(YEAR));
    // principal + reward, allow a small tolerance for block timestamp drift
    expect(received).to.be.closeTo(
      amount + expectedReward,
      ethers.parseEther("0.01"),
    );
  });

  it("reverts unstake before the lock expires", async () => {
    const [owner, alice] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy("Mock BUSD", "mBUSD");
    const Vault = await ethers.getContractFactory("StakingVault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      await token.getAddress(),
      owner.address,
    );
    await vault.connect(owner).createPlan(30 * 24 * 60 * 60, 1000); // 30-day lock
    await token.mint(alice.address, ethers.parseEther("100"));
    await token
      .connect(alice)
      .approve(await vault.getAddress(), ethers.parseEther("100"));
    await vault.connect(alice).stake(1, ethers.parseEther("100"));

    await expect(vault.connect(alice).unstake(0)).to.be.revertedWithCustomError(
      vault,
      "StillLocked",
    );
  });

  it("never blocks principal withdrawal, and preserves the unpaid reward remainder when the reserve is short", async () => {
    const { vault, token, alice, planId } = await loadFixture(deployFixture);
    const amount = ethers.parseEther("1000");

    await token.connect(alice).approve(await vault.getAddress(), amount);
    await vault.connect(alice).stake(planId, amount);

    // fund a reserve far smaller than what will accrue over a year
    const smallReserve = ethers.parseEther("1");
    await token.approve(await vault.getAddress(), smallReserve);
    await vault.fundRewards(smallReserve);

    await time.increase(YEAR); // accrues ~100 tokens of reward, reserve only has 1

    const principalBalBefore = await token.balanceOf(alice.address);
    await vault.connect(alice).unstake(0);
    const principalBalAfter = await token.balanceOf(alice.address);

    // principal always comes back in full, and only the available reserve
    // (1 token) was paid out alongside it
    expect(principalBalAfter - principalBalBefore).to.equal(
      amount + smallReserve,
    );
    expect(await vault.rewardReserve()).to.equal(0);

    const [, , , , , accruedReward] = await vault.positions(alice.address, 0);
    expect(accruedReward).to.be.gt(0); // the shortfall is retained, not forfeited

    // top up the reserve and confirm the remainder is now payable
    const topUp = ethers.parseEther("500");
    await token.approve(await vault.getAddress(), topUp);
    await vault.fundRewards(topUp);

    const rewardBalBefore = await token.balanceOf(alice.address);
    await expect(vault.connect(alice).claimReward(0)).to.emit(
      vault,
      "RewardClaimed",
    );
    const rewardBalAfter = await token.balanceOf(alice.address);
    expect(rewardBalAfter).to.be.gt(rewardBalBefore);

    const [, , , , , accruedRewardAfter] = await vault.positions(
      alice.address,
      0,
    );
    expect(accruedRewardAfter).to.equal(0);
  });

  it("credits only the amount actually received for a fee-on-transfer token", async () => {
    const [owner, alice] = await ethers.getSigners();
    const FeeToken = await ethers.getContractFactory("FeeOnTransferMockERC20");
    const feeToken = await FeeToken.deploy("Fee Token", "FEE", 500); // 5% fee on transfer

    const Vault = await ethers.getContractFactory("StakingVault");
    const vault = await Vault.deploy(
      await feeToken.getAddress(),
      await feeToken.getAddress(),
      owner.address,
    );
    await vault.connect(owner).createPlan(0, 0);

    await feeToken.mint(alice.address, ethers.parseEther("1000"));
    await feeToken
      .connect(alice)
      .approve(await vault.getAddress(), ethers.parseEther("1000"));

    const requested = ethers.parseEther("1000");
    const expectedReceived = (requested * 9500n) / 10_000n; // 5% burned in transit

    await expect(vault.connect(alice).stake(1, requested))
      .to.emit(vault, "Staked")
      .withArgs(alice.address, 0n, 1n, expectedReceived, 0n);

    const [, positionAmount] = await vault.positions(alice.address, 0);
    expect(positionAmount).to.equal(expectedReceived);
    expect(await vault.totalStaked()).to.equal(expectedReceived);
  });

  it("lets the owner recover an unrelated token but never the staking or reward token", async () => {
    const { vault, token, owner, alice } = await loadFixture(deployFixture);
    const Other = await ethers.getContractFactory("MockERC20");
    const other = await Other.deploy("Other", "OTH");
    await other.mint(await vault.getAddress(), ethers.parseEther("50"));

    await expect(
      vault
        .connect(owner)
        .recoverForeignToken(await token.getAddress(), owner.address, 1),
    ).to.be.revertedWithCustomError(vault, "CannotRecoverVaultToken");

    await vault
      .connect(owner)
      .recoverForeignToken(
        await other.getAddress(),
        owner.address,
        ethers.parseEther("50"),
      );
    expect(await other.balanceOf(owner.address)).to.equal(
      ethers.parseEther("50"),
    );

    // non-owner can't call it at all
    await expect(
      vault
        .connect(alice)
        .recoverForeignToken(await other.getAddress(), alice.address, 0),
    ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
  });

  it("blocks staking while paused", async () => {
    const { vault, token, owner, alice, planId } =
      await loadFixture(deployFixture);
    await vault.connect(owner).pause();
    await token
      .connect(alice)
      .approve(await vault.getAddress(), ethers.parseEther("1"));
    await expect(
      vault.connect(alice).stake(planId, ethers.parseEther("1")),
    ).to.be.revertedWithCustomError(vault, "EnforcedPause");
  });
});
