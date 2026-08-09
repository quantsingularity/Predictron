import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ReferralRegistry", () => {
  async function deployFixture() {
    const [user, referrer, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("ReferralRegistry");
    const registry = await Registry.deploy();
    return { registry, user, referrer, other };
  }

  it("records a referrer and emits ReferrerSet", async () => {
    const { registry, user, referrer } = await loadFixture(deployFixture);
    await expect(registry.connect(user).setReferrer(referrer.address))
      .to.emit(registry, "ReferrerSet")
      .withArgs(user.address, referrer.address);
    expect(await registry.getReferrer(user.address)).to.equal(referrer.address);
  });

  it("rejects a second referrer once one is set", async () => {
    const { registry, user, referrer, other } =
      await loadFixture(deployFixture);
    await registry.connect(user).setReferrer(referrer.address);
    await expect(
      registry.connect(user).setReferrer(other.address),
    ).to.be.revertedWithCustomError(registry, "ReferrerAlreadySet");
    // the first referrer set is unchanged
    expect(await registry.getReferrer(user.address)).to.equal(referrer.address);
  });

  it("rejects self-referral", async () => {
    const { registry, user } = await loadFixture(deployFixture);
    await expect(
      registry.connect(user).setReferrer(user.address),
    ).to.be.revertedWithCustomError(registry, "SelfReferral");
  });

  it("rejects the zero address as a referrer", async () => {
    const { registry, user } = await loadFixture(deployFixture);
    await expect(
      registry.connect(user).setReferrer(ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(registry, "ZeroAddress");
  });

  it("returns the zero address for a user with no referrer", async () => {
    const { registry, other } = await loadFixture(deployFixture);
    expect(await registry.getReferrer(other.address)).to.equal(
      ethers.ZeroAddress,
    );
  });
});
