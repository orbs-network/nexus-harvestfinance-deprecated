import { deployContract } from "../src/extensions";
import { Wallet } from "../src/impl/wallet";
import { expect } from "chai";
import { Tokens } from "../src/impl/token";
import { bn18, bn6 } from "../src/utils";
import { NexusSushiInsurance } from "../typechain-hardhat/NexusSushiInsurance";
import { impersonate } from "../src/network";
import BN from "bn.js";

describe("LiquidityNexus insurance contract tests", () => {
  const orbsHotWalletAddress = "0xF448E36E6E6EaF67403E682f6E4Cb87b9783c2aa";
  const usdcHotWalletAddress = "0x55FE002aefF02F77364de339a1292923A15844B8";

  it("should transfer given amount of asset by owner", async () => {
    const deployer = await Wallet.fake();
    const orbsHotWallet = await Wallet.fromAddress(orbsHotWalletAddress);
    await impersonate(orbsHotWallet.address);
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    await Tokens.eth.ORBS().methods.transfer(nexus.options.address, bn18("100")).send({ from: orbsHotWallet.address });
    await nexus.methods.transferOrbs(bn18("1")).send({ from: deployer.address });
    expect(await Tokens.eth.ORBS().methods.balanceOf(nexus.options.address).call()).eq(bn18("99").toString());
    expect(await Tokens.eth.ORBS().methods.balanceOf(deployer.address).call()).eq(bn18("1").toString());
  });

  it("should transfer the total amount of ORBS by owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const orbsHotWallet = await Wallet.fromAddress(orbsHotWalletAddress);
    await impersonate(orbsHotWallet.address);
    await Tokens.eth.ORBS().methods.transfer(nexus.options.address, bn18("100")).send({ from: orbsHotWallet.address });
    const deployerOrbsBalanceBefore = await Tokens.eth.ORBS().methods.balanceOf(deployer.address).call();
    await nexus.methods.transferOrbs("0").send({ from: deployer.address });
    const deployerOrbsBalanceAfter = await Tokens.eth.ORBS().methods.balanceOf(deployer.address).call();
    expect(await Tokens.eth.ORBS().methods.balanceOf(nexus.options.address).call()).eq(bn18("0").toString());
    expect(new BN(deployerOrbsBalanceAfter).sub(new BN(deployerOrbsBalanceBefore)).toString()).eq(
      bn18("100").toString()
    );
  });

  it("should transfer the total amount of an asset by owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const usdcHotWallet = await Wallet.fromAddress(usdcHotWalletAddress);
    await impersonate(usdcHotWallet.address);
    await Tokens.eth.USDC().methods.transfer(nexus.options.address, bn6("100")).send({ from: usdcHotWallet.address });
    const deployerBalanceBefore = await Tokens.eth.USDC().methods.balanceOf(deployer.address).call();
    await nexus.methods.transferAsset(Tokens.eth.USDC().address, "0").send({ from: deployer.address });
    const deployerBalanceAfter = await Tokens.eth.USDC().methods.balanceOf(deployer.address).call();
    expect(await Tokens.eth.USDC().methods.balanceOf(nexus.options.address).call()).eq(bn6("0").toString());
    expect(new BN(deployerBalanceAfter).sub(new BN(deployerBalanceBefore)).toString()).eq(bn6("100").toString());
  });

  it("should not transfer a given amount of an asset by non-owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const usdcHotWallet = await Wallet.fromAddress(usdcHotWalletAddress);
    await impersonate(usdcHotWallet.address);
    await Tokens.eth.USDC().methods.transfer(nexus.options.address, bn6("100")).send({ from: usdcHotWallet.address });
    const nonOwner = await Wallet.fake(1);
    let error = await nexus.methods
      .transferAsset(Tokens.eth.USDC().address, "0")
      .send({ from: nonOwner.address })
      .catch((e) => e);
    expect(error.message).to.have.string("caller is not the owner");
  });

  it("should not transfer a given amount of ORBS by non-owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const orbsHotWallet = await Wallet.fromAddress(orbsHotWalletAddress);
    await impersonate(orbsHotWallet.address);
    await Tokens.eth.ORBS().methods.transfer(nexus.options.address, bn18("100")).send({ from: orbsHotWallet.address });
    const nonOwner = await Wallet.fake(1);
    let error = await nexus.methods
      .transferOrbs("0")
      .send({ from: nonOwner.address })
      .catch((e) => e);
    expect(error.message).to.have.string("caller is not the owner");
  });

  it("should transfer a given list of tokens by owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const usdcHotWallet = await Wallet.fromAddress(usdcHotWalletAddress);
    await impersonate(usdcHotWallet.address);
    const orbsHotWallet = await Wallet.fromAddress(orbsHotWalletAddress);
    await impersonate(orbsHotWallet.address);
    await Tokens.eth.USDC().methods.transfer(nexus.options.address, bn6("100")).send({ from: usdcHotWallet.address });
    await Tokens.eth.ORBS().methods.transfer(nexus.options.address, bn18("100")).send({ from: orbsHotWallet.address });
    const deployerUSDCBalanceBefore = await Tokens.eth.USDC().methods.balanceOf(deployer.address).call();
    const deployerORBSBalanceBefore = await Tokens.eth.ORBS().methods.balanceOf(deployer.address).call();
    await nexus.methods
      .rescueAssets([Tokens.eth.USDC().address, Tokens.eth.ORBS().address])
      .send({ from: deployer.address });
    const deployerUSDCBalanceAfter = await Tokens.eth.USDC().methods.balanceOf(deployer.address).call();
    const deployerORBSBalanceAfter = await Tokens.eth.ORBS().methods.balanceOf(deployer.address).call();
    expect(await Tokens.eth.USDC().methods.balanceOf(nexus.options.address).call()).eq(bn6("0").toString());
    expect(await Tokens.eth.ORBS().methods.balanceOf(nexus.options.address).call()).eq(bn18("0").toString());
    expect(new BN(deployerUSDCBalanceAfter).sub(new BN(deployerUSDCBalanceBefore)).toString()).eq(
      bn6("100").toString()
    );
    expect(new BN(deployerORBSBalanceAfter).sub(new BN(deployerORBSBalanceBefore)).toString()).eq(
      bn18("100").toString()
    );
  });

  it("should not transfer a given list of tokens by non-owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const usdcHotWallet = await Wallet.fromAddress(usdcHotWalletAddress);
    await impersonate(usdcHotWallet.address);
    const orbsHotWallet = await Wallet.fromAddress(orbsHotWalletAddress);
    await impersonate(orbsHotWallet.address);
    await Tokens.eth.USDC().methods.transfer(nexus.options.address, bn6("100")).send({ from: usdcHotWallet.address });
    await Tokens.eth.ORBS().methods.transfer(nexus.options.address, bn18("100")).send({ from: orbsHotWallet.address });
    const nonOwner = await Wallet.fake(1);
    let error = await nexus.methods
      .rescueAssets([Tokens.eth.USDC().address, Tokens.eth.ORBS().address])
      .send({ from: nonOwner.address })
      .catch((e) => e);
    expect(error.message).to.have.string("caller is not the owner");
  });

  it("should be able to update the owner and transfer ORBS tokens to the new owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const orbsHotWallet = await Wallet.fromAddress(orbsHotWalletAddress);
    await impersonate(orbsHotWallet.address);
    await Tokens.eth.ORBS().methods.transfer(nexus.options.address, bn18("100")).send({ from: orbsHotWallet.address });
    const newOwner = await Wallet.fake(2);
    const deployerOrbsBalanceBefore = await Tokens.eth.ORBS().methods.balanceOf(newOwner.address).call();
    await nexus.methods.transferOwnership(newOwner.address).send({ from: deployer.address });
    await nexus.methods.transferOrbs("0").send({ from: newOwner.address });
    const deployerOrbsBalanceAfter = await Tokens.eth.ORBS().methods.balanceOf(newOwner.address).call();
    expect(await Tokens.eth.ORBS().methods.balanceOf(nexus.options.address).call()).eq(bn18("0").toString());
    expect(new BN(deployerOrbsBalanceAfter).sub(new BN(deployerOrbsBalanceBefore)).toString()).eq(
      bn18("100").toString()
    );
  });

  it("should not be able transfer tokens by the previous owner", async () => {
    const deployer = await Wallet.fake();
    const nexus = await deployContract<NexusSushiInsurance>("NexusSushiInsurance", deployer.address);
    const orbsHotWallet = await Wallet.fromAddress(orbsHotWalletAddress);
    await impersonate(orbsHotWallet.address);
    await Tokens.eth.ORBS().methods.transfer(nexus.options.address, bn18("100")).send({ from: orbsHotWallet.address });
    const newOwner = await Wallet.fake(2);
    await nexus.methods.transferOwnership(newOwner.address).send({ from: deployer.address });
    let error = await nexus.methods
      .transferOrbs("0")
      .send({ from: deployer.address })
      .catch((e) => e);
    expect(error.message).to.have.string("caller is not the owner");
  });
});
