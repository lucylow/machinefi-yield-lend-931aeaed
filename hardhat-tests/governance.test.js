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

async function expectRevert(txPromise) {
  try {
    await txPromise;
    expect.fail("expected revert");
  } catch {
    // ok
  }
}

describe("Governance control plane (whitepaper §14)", function () {
  describe("ProtocolParameterRegistry", function () {
    it("reverts out-of-bounds values for known keys", async function () {
      const [admin] = await ethers.getSigners();
      const Reg = await ethers.getContractFactory("ProtocolParameterRegistry");
      const reg = await Reg.deploy(admin.address);
      await reg.waitForDeployment();
      const key = await reg.KEY_ORACLE_MAX_DEVIATION_BPS();
      await expectRevertCustomError(
        reg.connect(admin).setUint(key, 10n, 0, "too low"),
        reg.interface,
        "ValueOutOfBounds",
      );
    });

    it("accepts in-bounds oracle.maxDeviationBps", async function () {
      const [admin] = await ethers.getSigners();
      const Reg = await ethers.getContractFactory("ProtocolParameterRegistry");
      const reg = await Reg.deploy(admin.address);
      await reg.waitForDeployment();
      const key = await reg.KEY_ORACLE_MAX_DEVIATION_BPS();
      await reg.connect(admin).setUint(key, 500n, 1, "tighten");
      expect(await reg.uintParam(key)).to.equal(500n);
    });
  });

  describe("DePINClassRegistry", function () {
    it("reverts class configs that violate risk bounds", async function () {
      const [admin] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("DePINClassRegistry");
      const reg = await Factory.deploy(admin.address);
      await reg.waitForDeployment();
      const c = await reg.getClassConfig(0n);
      const bad = {
        proofFreshnessWindow: c.proofFreshnessWindow,
        minProofInterval: c.minProofInterval,
        yieldSmoothingWindowSec: c.yieldSmoothingWindowSec,
        classLtvBps: 1000n,
        liquidationThresholdBps: 9000n,
        confidenceWeightBps: c.confidenceWeightBps,
        staleMetadataHaircutBps: c.staleMetadataHaircutBps,
        staleProofExtraHaircutBps: c.staleProofExtraHaircutBps,
        minConfidenceToBorrow: c.minConfidenceToBorrow,
        baseCollateralValueWad: c.baseCollateralValueWad,
        requireInitialAttestation: c.requireInitialAttestation,
        supportedProofTypesBitmask: c.supportedProofTypesBitmask,
      };
      await expectRevertCustomError(
        reg.connect(admin).setClassConfig(0, bad, "bad ltv"),
        reg.interface,
        "ClassConfigOutOfBounds",
      );
    });
  });

  describe("OracleManager", function () {
    it("rejects provider changes from accounts without GOVERNOR_ROLE", async function () {
      const [admin, stranger, provider] = await ethers.getSigners();
      const Om = await ethers.getContractFactory("OracleManager");
      const om = await Om.deploy(admin.address);
      await om.waitForDeployment();
      await expectRevert(om.connect(stranger).addProvider(provider.address));
    });

    it("allows GUARDIAN_ROLE to trip breaker and GOVERNOR_ROLE to reset", async function () {
      const [admin, guardian] = await ethers.getSigners();
      const Om = await ethers.getContractFactory("OracleManager");
      const om = await Om.deploy(admin.address);
      await om.waitForDeployment();
      const GUARDIAN = await om.GUARDIAN_ROLE();
      await om.connect(admin).grantRole(GUARDIAN, guardian.address);
      await om.connect(admin).revokeRole(GUARDIAN, admin.address);
      await om.connect(guardian).tripCircuitBreaker("test");
      expect(await om.circuitBreakerTripped()).to.equal(true);
      await expectRevert(om.connect(guardian).resetCircuitBreaker());
      await om.connect(admin).resetCircuitBreaker();
      expect(await om.circuitBreakerTripped()).to.equal(false);
    });
  });

  describe("LendingPool", function () {
    it("rejects setOracle from non-governor", async function () {
      const [deployer, user] = await ethers.getSigners();
      const stable = await ethers.deployContract("MockERC20", [], deployer);
      const nft = await ethers.deployContract("HardwareNFT", [], deployer);
      const pool = await ethers.deployContract("LendingPool", [await stable.getAddress(), await nft.getAddress()], deployer);
      await expectRevert(pool.connect(user).setOracle(user.address));
    });

    it("global pause blocks new borrows (§14.7)", async function () {
      const [deployer, borrower] = await ethers.getSigners();
      const stable = await ethers.deployContract("MockERC20", [], deployer);
      const nft = await ethers.deployContract("HardwareNFT", [], deployer);
      const pool = await ethers.deployContract("LendingPool", [await stable.getAddress(), await nft.getAddress()], deployer);
      await nft.connect(deployer).setLendingPool(await pool.getAddress());

      await stable.mint(borrower.address, ethers.parseEther("1000000"));
      await stable.mint(await pool.getAddress(), ethers.parseEther("500000"));
      await stable.connect(borrower).approve(await pool.getAddress(), ethers.MaxUint256);

      const deviceId = ethers.encodeBytes32String("GOV-PAUSE-1");
      const pk = ethers.toUtf8Bytes("pk");
      const regRc = await (await nft.connect(borrower).registerDevice(deviceId, 0, "gf://g", pk)).wait();
      let tokenId = 1n;
      for (const log of regRc.logs) {
        try {
          const parsed = nft.interface.parseLog(log);
          if (parsed?.name === "DeviceRegistered") {
            tokenId = parsed.args[0];
            break;
          }
        } catch {
          /* ignore */
        }
      }
      await nft.connect(deployer).verifyDevice(tokenId);
      await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);

      await pool.connect(deployer).pause();
      await expectRevert(pool.connect(borrower).deposit(tokenId, 50n, ethers.parseEther("1000")));
    });

    it("reverts setMaxInitialLTV above liquidation threshold", async function () {
      const [deployer] = await ethers.getSigners();
      const stable = await ethers.deployContract("MockERC20", [], deployer);
      const nft = await ethers.deployContract("HardwareNFT", [], deployer);
      const pool = await ethers.deployContract("LendingPool", [await stable.getAddress(), await nft.getAddress()], deployer);
      await expectRevertCustomError(
        pool.connect(deployer).setMaxInitialLTV(8000n),
        pool.interface,
        "MaxLtvNotBelowLiquidation",
      );
    });
  });

  describe("MachineFiGovernor", function () {
    it("rejects proposals to non-contract targets when allowlist is enforced", async function () {
      const [deployer, voter] = await ethers.getSigners();
      const mach = await ethers.deployContract("MACH", [ethers.parseEther("2000")], deployer);
      const tokenAddr = await mach.getAddress();

      const Timelock = await ethers.getContractFactory("MachineFiTimelock");
      const timelock = await Timelock.deploy(0n, [deployer.address], [deployer.address], deployer.address);
      await timelock.waitForDeployment();
      const tlAddr = await timelock.getAddress();

      const trusted = await ethers.deployContract("MockERC20", [], deployer);
      const trustedAddr = await trusted.getAddress();

      const Gov = await ethers.getContractFactory("MachineFiGovernor");
      const gov = await Gov.deploy(
        "TestGov",
        tokenAddr,
        tlAddr,
        0n,
        8n,
        ethers.parseEther("1"),
        4n,
        [trustedAddr],
        true,
      );
      await gov.waitForDeployment();

      await mach.transfer(voter.address, ethers.parseEther("1500"));
      await mach.connect(voter).delegate(voter.address);
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      const iface = new ethers.Interface(["function transfer(address,uint256)"]);
      const calldata = iface.encodeFunctionData("transfer", [voter.address, 1n]);

      await expectRevertCustomError(
        gov.connect(voter).propose([voter.address], [0n], [calldata], "bad eoa target"),
        gov.interface,
        "ProposalTargetNotContract",
      );
    });
  });
});
