import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function expectRevertCustomError(txPromise, iface, errorName) {
  try {
    await txPromise;
    expect.fail("expected revert");
  } catch (e) {
    const data = e?.data ?? e?.error?.data;
    if (typeof data === "string" && iface) {
      const parsed = iface.parseError(data);
      expect(parsed?.name).to.equal(errorName);
      return;
    }
    const msg = String(e?.shortMessage ?? e?.message ?? e);
    expect(msg).to.match(new RegExp(errorName, "i"));
  }
}

describe("Security model (whitepaper §16)", function () {
  describe("HardwareNFT", function () {
    it("rejects duplicate deviceId registration", async function () {
      const [deployer, user] = await ethers.getSigners();
      const nft = await ethers.deployContract("HardwareNFT", [], deployer);
      const id = ethers.encodeBytes32String("SERIAL-A");
      const pk = ethers.toUtf8Bytes("pk-a");
      await nft.connect(user).registerDevice(id, 0, "gf://a", pk);
      const iface = nft.interface;
      await expectRevertCustomError(
        nft.connect(user).registerDevice(id, 0, "gf://b", pk),
        iface,
        "DeviceAlreadyRegistered",
      );
    });

    it("Unverified devices cannot borrow or carry risk-adjusted value", async function () {
      const [deployer, registrar, user] = await ethers.getSigners();
      const nft = await ethers.deployContract("HardwareNFT", [], deployer);
      await nft.setAuthorizedRegistrar(registrar.address);
      const id = ethers.encodeBytes32String("SERIAL-U");
      await nft.connect(registrar).registerDevice(id, 0, "gf://u", ethers.toUtf8Bytes("pk-u"));
      const tid = 1n;
      expect(await nft.canUseAsCollateral(tid)).to.equal(false);
      expect(await nft.riskAdjustedCollateralWad(tid)).to.equal(0n);
      await nft.connect(deployer).verifyDevice(tid);
      expect(await nft.canUseAsCollateral(tid)).to.equal(true);
      expect(await nft.riskAdjustedCollateralWad(tid)).to.be.gt(0n);
    });

    it("reverts verifyAndUpdateProof with ProofNonceMismatch when nonce does not match sequence", async function () {
      const [deployer, oracle, user] = await ethers.getSigners();
      const nft = await ethers.deployContract("HardwareNFT", [], deployer);
      await nft.setOracle(oracle.address);
      const id = ethers.encodeBytes32String("SERIAL-N");
      await nft.connect(user).registerDevice(id, 0, "gf://n", ethers.toUtf8Bytes("pk"));
      const hash = ethers.keccak256(ethers.toUtf8Bytes("proof"));
      const ts = (await ethers.provider.getBlock("latest")).timestamp;
      await expectRevertCustomError(
        nft.connect(oracle).verifyAndUpdateProof(1n, 99n, hash, ts, "0x"),
        nft.interface,
        "ProofNonceMismatch",
      );
    });
  });

  describe("OracleManager", function () {
    it("emits OracleFallbackActivated when consensus cannot form", async function () {
      const [admin, p1] = await ethers.getSigners();
      const om = await ethers.deployContract("OracleManager", [ethers.ZeroAddress], admin);
      await om.setMinProvidersForConsensus(2n);
      await om.addProvider(p1.address);
      const tx = await om.connect(p1).submitData(1n, ethers.parseEther("100"), 5000n, "0x");
      const rc = await tx.wait();
      const parsed = rc.logs
        .map((l) => {
          try {
            return om.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((x) => x?.name === "OracleFallbackActivated");
      expect(parsed).to.not.equal(undefined);
      expect(parsed.args[0]).to.equal(1n);
      expect(parsed.args[1]).to.equal("no_consensus");
    });
  });
});
