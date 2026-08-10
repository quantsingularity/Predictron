import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ROUND_DURATION = 5 * 60; // 5 minutes

describe("PredictionGame", () => {
  async function deployFixture() {
    const [owner, alice, bob, referrer] = await ethers.getSigners();

    const Feed = await ethers.getContractFactory("MockV3Aggregator");
    const feed = await Feed.deploy(8, 100_000_000_00n); // $100.00 at 8 decimals

    const Registry = await ethers.getContractFactory("ReferralRegistry");
    const registry = await Registry.deploy();

    const Game = await ethers.getContractFactory("PredictionGame");
    const game = await Game.deploy(
      await feed.getAddress(),
      await registry.getAddress(),
      ROUND_DURATION,
      owner.address,
    );

    return { game, feed, registry, owner, alice, bob, referrer };
  }

  async function playFullRound(
    game: any,
    feed: any,
    alice: any,
    bob: any,
    lockPrice: bigint,
    closePrice: bigint,
  ) {
    await game.startRound();
    const epoch = await game.currentEpoch();

    await game.connect(alice).bet(epoch, 1, { value: ethers.parseEther("1") }); // Up
    await game.connect(bob).bet(epoch, 0, { value: ethers.parseEther("1") }); // Down

    await time.increase(ROUND_DURATION + 1);
    await feed.setAnswer(lockPrice);
    await game.lockRound(epoch);

    await time.increase(ROUND_DURATION + 1);
    await feed.setAnswer(closePrice);
    await game.closeRound(epoch);

    return epoch;
  }

  it("rejects a zero address or zero duration in the constructor", async () => {
    const [owner] = await ethers.getSigners();
    const Feed = await ethers.getContractFactory("MockV3Aggregator");
    const feed = await Feed.deploy(8, 100_000_000_00n);
    const Registry = await ethers.getContractFactory("ReferralRegistry");
    const registry = await Registry.deploy();
    const Game = await ethers.getContractFactory("PredictionGame");

    await expect(
      Game.deploy(
        ethers.ZeroAddress,
        await registry.getAddress(),
        ROUND_DURATION,
        owner.address,
      ),
    ).to.be.revertedWithCustomError(Game, "ZeroAddress");
    await expect(
      Game.deploy(
        await feed.getAddress(),
        await registry.getAddress(),
        0,
        owner.address,
      ),
    ).to.be.revertedWithCustomError(Game, "ZeroAmount");
  });

  it("runs a full round: Up wins, Down loses, house fee is retained", async () => {
    const { game, feed, alice, bob } = await loadFixture(deployFixture);
    const epoch = await playFullRound(
      game,
      feed,
      alice,
      bob,
      100_000_000_00n,
      110_000_000_00n,
    ); // price went up

    const pool = ethers.parseEther("2");
    const fee = (pool * 300n) / 10_000n; // 3% default fee
    const expectedPayout = pool - fee; // Alice wins the whole pool minus fee (she was the only Up bettor)

    const balBefore = await ethers.provider.getBalance(alice.address);
    const tx = await game.connect(alice).claim(epoch);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const balAfter = await ethers.provider.getBalance(alice.address);

    expect(balAfter - balBefore + gasCost).to.equal(expectedPayout);
    expect(await game.treasuryBalance()).to.equal(fee);

    // Bob lost, claim succeeds with a zero payout, and can't be claimed twice
    await expect(game.connect(bob).claim(epoch))
      .to.emit(game, "Claimed")
      .withArgs(bob.address, epoch, 0);
    await expect(game.connect(bob).claim(epoch)).to.be.revertedWithCustomError(
      game,
      "NothingToClaim",
    );
  });

  it("refunds everyone in full on a tie, with no fee", async () => {
    const { game, feed, alice, bob } = await loadFixture(deployFixture);
    const epoch = await playFullRound(
      game,
      feed,
      alice,
      bob,
      100_000_000_00n,
      100_000_000_00n,
    ); // unchanged price

    const balBefore = await ethers.provider.getBalance(bob.address);
    const tx = await game.connect(bob).claim(epoch);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const balAfter = await ethers.provider.getBalance(bob.address);

    expect(balAfter - balBefore + gasCost).to.equal(ethers.parseEther("1")); // full stake back
    expect(await game.treasuryBalance()).to.equal(0);
  });

  it("cancels the round and refunds bettors if no one calls lockRound in time", async () => {
    const { game, feed, alice, bob } = await loadFixture(deployFixture);
    await game.startRound();
    const epoch = await game.currentEpoch();
    await game.connect(alice).bet(epoch, 1, { value: ethers.parseEther("1") });
    await game.connect(bob).bet(epoch, 0, { value: ethers.parseEther("1") });

    // skip straight past close without ever locking
    await time.increase(2 * ROUND_DURATION + 1);
    await expect(game.closeRound(epoch)).to.emit(game, "RoundCancelled");

    const balBefore = await ethers.provider.getBalance(alice.address);
    const tx = await game.connect(alice).claim(epoch);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const balAfter = await ethers.provider.getBalance(alice.address);
    expect(balAfter - balBefore + gasCost).to.equal(ethers.parseEther("1"));
  });

  it("prevents starting a new round before the current one is resolved", async () => {
    const { game } = await loadFixture(deployFixture);
    await game.startRound();
    await expect(game.startRound()).to.be.revertedWithCustomError(
      game,
      "RoundAlreadyLive",
    );

    // even many rapid calls can't fragment the epoch counter
    for (let i = 0; i < 5; i++) {
      await expect(game.startRound()).to.be.revertedWithCustomError(
        game,
        "RoundAlreadyLive",
      );
    }
    expect(await game.currentEpoch()).to.equal(1);
  });

  it("allows the next round once the previous one is closed", async () => {
    const { game, feed, alice, bob } = await loadFixture(deployFixture);
    await playFullRound(
      game,
      feed,
      alice,
      bob,
      100_000_000_00n,
      105_000_000_00n,
    );
    await expect(game.startRound()).to.not.be.reverted;
    expect(await game.currentEpoch()).to.equal(2);
  });

  it("rejects a stale oracle price", async () => {
    const { game, feed, alice, bob } = await loadFixture(deployFixture);
    await game.startRound();
    const epoch = await game.currentEpoch();
    await game.connect(alice).bet(epoch, 1, { value: ethers.parseEther("1") });
    await game.connect(bob).bet(epoch, 0, { value: ethers.parseEther("1") });

    await time.increase(ROUND_DURATION + 1);
    const staleTimestamp = (await time.latest()) - 2 * 60 * 60; // 2 hours old
    await feed.setStale(staleTimestamp);
    await expect(game.lockRound(epoch)).to.be.revertedWith("stale price feed");
  });

  it("rejects a zero/negative oracle answer", async () => {
    const { game, feed, alice, bob } = await loadFixture(deployFixture);
    await game.startRound();
    const epoch = await game.currentEpoch();
    await game.connect(alice).bet(epoch, 1, { value: ethers.parseEther("1") });
    await game.connect(bob).bet(epoch, 0, { value: ethers.parseEther("1") });

    await time.increase(ROUND_DURATION + 1);
    await feed.setAnswer(0);
    await expect(game.lockRound(epoch)).to.be.revertedWith(
      "invalid price feed answer",
    );
  });

  it("accrues a referral reward to a winner's referrer and pays it out separately from claim()", async () => {
    const { game, feed, alice, bob, referrer } =
      await loadFixture(deployFixture);

    const reg = await ethers.getContractAt(
      "ReferralRegistry",
      await game.referralRegistry(),
    );
    await reg.connect(alice).setReferrer(referrer.address);

    const epoch = await playFullRound(
      game,
      feed,
      alice,
      bob,
      100_000_000_00n,
      110_000_000_00n,
    );

    const pool = ethers.parseEther("2");
    const fee = (pool * 300n) / 10_000n;
    const referralShareBps = await game.referralShareBps();
    const expectedReferralCut = (fee * referralShareBps) / 10_000n;

    await expect(game.connect(alice).claim(epoch))
      .to.emit(game, "ReferralRewardAccrued")
      .withArgs(referrer.address, alice.address, epoch, expectedReferralCut);

    expect(await game.pendingReferralReward(referrer.address)).to.equal(
      expectedReferralCut,
    );
    expect(await game.treasuryBalance()).to.equal(fee - expectedReferralCut);

    const balBefore = await ethers.provider.getBalance(referrer.address);
    const tx = await game.connect(referrer).claimReferralReward();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const balAfter = await ethers.provider.getBalance(referrer.address);
    expect(balAfter - balBefore + gasCost).to.equal(expectedReferralCut);

    // draining twice fails
    await expect(
      game.connect(referrer).claimReferralReward(),
    ).to.be.revertedWithCustomError(game, "NothingToClaim");
  });

  it("pays no referral reward when the winner has no registered referrer", async () => {
    const { game, feed, alice, bob } = await loadFixture(deployFixture);
    const epoch = await playFullRound(
      game,
      feed,
      alice,
      bob,
      100_000_000_00n,
      110_000_000_00n,
    );
    await game.connect(alice).claim(epoch);

    const pool = ethers.parseEther("2");
    const fee = (pool * 300n) / 10_000n;
    expect(await game.treasuryBalance()).to.equal(fee); // entire fee stays with treasury
  });

  it("caps the owner-settable fee and referral share", async () => {
    const { game, owner } = await loadFixture(deployFixture);
    await expect(
      game.connect(owner).setTreasuryFeeBps(1001),
    ).to.be.revertedWithCustomError(game, "FeeTooHigh");
    await expect(
      game.connect(owner).setReferralShareBps(5001),
    ).to.be.revertedWithCustomError(game, "FeeTooHigh");
    await expect(game.connect(owner).setTreasuryFeeBps(1000)).to.not.be
      .reverted;
    await expect(game.connect(owner).setReferralShareBps(5000)).to.not.be
      .reverted;
  });

  it("lets the owner withdraw the treasury balance, and only the owner", async () => {
    const { game, feed, alice, bob, owner } = await loadFixture(deployFixture);
    const epoch = await playFullRound(
      game,
      feed,
      alice,
      bob,
      100_000_000_00n,
      110_000_000_00n,
    );
    await game.connect(alice).claim(epoch);

    const treasury = await game.treasuryBalance();
    expect(treasury).to.be.gt(0);

    await expect(
      game.connect(alice).withdrawTreasury(alice.address),
    ).to.be.revertedWithCustomError(game, "OwnableUnauthorizedAccount");

    const balBefore = await ethers.provider.getBalance(owner.address);
    const tx = await game.connect(owner).withdrawTreasury(owner.address);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const balAfter = await ethers.provider.getBalance(owner.address);
    expect(balAfter - balBefore + gasCost).to.equal(treasury);
    expect(await game.treasuryBalance()).to.equal(0);
  });

  it("rejects a second bet in the same round from the same address", async () => {
    const { game, alice } = await loadFixture(deployFixture);
    await game.startRound();
    const epoch = await game.currentEpoch();
    await game.connect(alice).bet(epoch, 1, { value: ethers.parseEther("1") });
    await expect(
      game.connect(alice).bet(epoch, 0, { value: ethers.parseEther("1") }),
    ).to.be.revertedWithCustomError(game, "AlreadyBet");
  });

  it("rejects betting after the round has locked", async () => {
    const { game, alice } = await loadFixture(deployFixture);
    await game.startRound();
    const epoch = await game.currentEpoch();
    await time.increase(ROUND_DURATION + 1);
    await expect(
      game.connect(alice).bet(epoch, 1, { value: ethers.parseEther("1") }),
    ).to.be.revertedWithCustomError(game, "RoundNotBettable");
  });
});
