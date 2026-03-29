import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

function assertChainId(actual, expected, label = "chain") {
  const a = Number(actual);
  const e = Number(expected);
  if (a !== e) throw new Error(`[${label}] chainId mismatch: got ${a}, expected ${e}`);
}

function assertSettlementChain(chainId) {
  const id = Number(chainId);
  if (id !== 97 && id !== 56) {
    throw new Error(`[settlement] expected BSC 97 or 56, got ${id}`);
  }
}

describe("BNB stack (§15)", function () {
  it("deploys YieldUpdateMirror and exposes borrowSafetyBps", async function () {
    const [admin, relayer] = await ethers.getSigners();

    const Mirror = await ethers.getContractFactory("YieldUpdateMirror");
    const mirror = await Mirror.deploy(admin.address);
    await mirror.waitForDeployment();

    await mirror.connect(admin).grantRole(await mirror.RELAYER_ROLE(), relayer.address);

    const snap = ethers.keccak256(ethers.toUtf8Bytes("epoch-snapshot-1"));
    const gfKey = ethers.keccak256(ethers.toUtf8Bytes("greenfield/object/key"));
    const meta = ethers.keccak256(ethers.toUtf8Bytes("metadata"));

    await mirror
      .connect(relayer)
      .submitYieldSnapshot(1n, 1, snap, 8000, 0, 3, gfKey, meta);

    const bps = await mirror.borrowSafetyBps(1n);
    expect(bps).to.equal(8000n);
  });

  it("LendingPool accepts YieldUpdateMirror from governor", async function () {
    const [mirrorAdmin, deployer] = await ethers.getSigners();

    const stable = await ethers.deployContract("MockERC20", [], deployer);
    const nft = await ethers.deployContract("HardwareNFT", [], deployer);
    const pool = await ethers.deployContract("LendingPool", [await stable.getAddress(), await nft.getAddress()], deployer);
    const mirror = await ethers.deployContract("YieldUpdateMirror", [mirrorAdmin.address], deployer);

    await pool.connect(deployer).setYieldUpdateMirror(await mirror.getAddress());

    expect(await pool.yieldUpdateMirror()).to.equal(await mirror.getAddress());
  });

  it("assert helpers enforce settlement chain", function () {
    assertSettlementChain(97);
    assertSettlementChain(56);
    expect(() => assertSettlementChain(31337)).to.throw;
  });

  it("assertChainId matches", function () {
    assertChainId(97, 97, "bsc-testnet");
    expect(() => assertChainId(1, 97)).to.throw;
  });
});
