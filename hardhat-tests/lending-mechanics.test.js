import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function expectRevert(txPromise) {
  try {
    await txPromise;
    expect.fail("expected revert");
  } catch {
    /* ok */
  }
}

async function expectRevertCustomError(txPromise, iface, errorName) {
  try {
    await txPromise;
    expect.fail("expected revert");
  } catch (e) {
    const nested =
      (typeof e?.data === "string" && e.data) ||
      (typeof e?.error?.data === "string" && e.error.data) ||
      (typeof e?.error?.data?.data === "string" && e.error.data.data) ||
      null;
    if (nested && iface) {
      try {
        const parsed = iface.parseError(nested);
        expect(parsed?.name).to.equal(errorName);
        return;
      } catch {
        /* fall through */
      }
    }
    const msg = String(e?.shortMessage ?? e?.message ?? e);
    expect(msg).to.match(new RegExp(errorName, "i"));
  }
}

async function registerVerifiedDevice(nft, user, deployer, deviceLabel, deviceType) {
  const deviceId = ethers.encodeBytes32String(deviceLabel);
  const pk = ethers.toUtf8Bytes(`pk-${deviceLabel}`);
  const rc = await (await nft.connect(user).registerDevice(deviceId, deviceType, "gf://lend", pk)).wait();
  let tokenId = 1n;
  for (const log of rc.logs) {
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
  return tokenId;
}

describe("Lending mechanics (§11 deposit / borrow / repay / HF / lifecycle)", function () {
  async function deployFixture() {
    const [deployer, borrower, helper] = await ethers.getSigners();
    const stable = await ethers.deployContract("MockERC20", [], deployer);
    const nft = await ethers.deployContract("HardwareNFT", [], deployer);
    const pool = await ethers.deployContract("LendingPool", [await stable.getAddress(), await nft.getAddress()], deployer);
    await nft.connect(deployer).setLendingPool(await pool.getAddress());

    await stable.mint(borrower.address, ethers.parseEther("2000000"));
    await stable.mint(helper.address, ethers.parseEther("2000000"));
    await stable.mint(await pool.getAddress(), ethers.parseEther("1000000"));
    await stable.connect(borrower).approve(await pool.getAddress(), ethers.MaxUint256);
    await stable.connect(helper).approve(await pool.getAddress(), ethers.MaxUint256);

    return { deployer, borrower, helper, stable, nft, pool };
  }

  it("open borrow emits BorrowOpened, HealthFactorUpdated, and enforces min post-borrow HF", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H1", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);

    const borrowAmt = ethers.parseEther("200");
    const tx = await pool.connect(borrower).deposit(tokenId, 50n, borrowAmt);
    const rc = await tx.wait();

    const borrowOpened = rc.logs
      .map((l) => {
        try {
          return pool.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((x) => x?.name === "BorrowOpened");
    expect(borrowOpened).to.not.equal(undefined);
    expect(borrowOpened.args.healthFactorWad).to.be.gt(ethers.parseEther("1"));

    await expectRevertCustomError(
      pool.connect(deployer).setMinPostBorrowHealthFactorWad(ethers.parseEther("10")),
      pool.interface,
      "MinPostBorrowHealthOutOfBounds",
    );
  });

  it("reverts borrow when min post-borrow HF is raised above achievable HF at max LTV", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H2", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);

    await pool.connect(deployer).setMinPostBorrowHealthFactorWad(ethers.parseEther("1.08"));
    const coll = await nft.riskAdjustedCollateralWad(tokenId);
    const maxLtv = await pool.maxInitialLTV();
    const maxBorrow = (coll * maxLtv) / 10000n;

    await expectRevertCustomError(
      pool.connect(borrower).deposit(tokenId, 50n, maxBorrow),
      pool.interface,
      "UnsafeBorrowHealth",
    );
  });

  it("partial repay reduces debt and keeps NFT escrowed; full repay releases", async function () {
    const { deployer, borrower, pool, nft, stable } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H3", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);

    const borrowAmt = ethers.parseEther("200");
    await pool.connect(borrower).deposit(tokenId, 40n, borrowAmt);

    const halfPrincipal = borrowAmt / 2n;
    await pool.connect(borrower).repayPartial(tokenId, halfPrincipal);

    const p = await pool.positions(tokenId);
    const targetPrincipal = borrowAmt - halfPrincipal;
    const drift = p.debt > targetPrincipal ? p.debt - targetPrincipal : targetPrincipal - p.debt;
    expect(drift).to.be.lt(ethers.parseEther("0.01"));
    expect(await nft.ownerOf(tokenId)).to.equal(await pool.getAddress());

    await pool.connect(borrower).repay(tokenId);

    const closed = await pool.positions(tokenId);
    expect(closed.debt).to.equal(0n);
    expect(await nft.ownerOf(tokenId)).to.equal(borrower.address);
  });

  it("repay applies protocol interest then LP interest then principal (order)", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H4", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);
    await pool.connect(borrower).deposit(tokenId, 30n, ethers.parseEther("200"));

    await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600]);
    await ethers.provider.send("evm_mine", []);

    await pool.accrueInterest(tokenId);
    const before = await pool.positions(tokenId);
    expect(before.accruedProtocolInterest).to.be.gt(0n);

    const pay = before.accruedProtocolInterest * 2n + 1n;
    await pool.connect(borrower).repayPartial(tokenId, pay);
    const after = await pool.positions(tokenId);
    expect(after.debt).to.equal(before.debt);
    expect(after.accruedProtocolInterest).to.equal(0n);
    expect(after.accruedLpInterest).to.be.lte(before.accruedLpInterest);
  });

  it("global pause blocks borrow but repay remains available", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H5", 0);
    const tokenId2 = await registerVerifiedDevice(nft, borrower, deployer, "H5b", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);
    await pool.connect(borrower).deposit(tokenId, 55n, ethers.parseEther("150"));

    await pool.connect(deployer).pause();
    await expectRevert(pool.connect(borrower).deposit(tokenId2, 55n, ethers.parseEther("1")));

    await pool.connect(borrower).repay(tokenId);
    expect(await nft.ownerOf(tokenId)).to.equal(borrower.address);
  });

  it("repayPaused blocks repayment until cleared", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H6", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);
    await pool.connect(borrower).deposit(tokenId, 60n, ethers.parseEther("120"));

    await pool.connect(deployer).setRepayPaused(true);
    let blocked = false;
    try {
      await (await pool.connect(borrower).repay(tokenId)).wait();
    } catch {
      blocked = true;
    }
    expect(blocked).to.equal(true);

    await pool.connect(deployer).setRepayPaused(false);
    await pool.connect(borrower).repay(tokenId);
    expect(await nft.ownerOf(tokenId)).to.equal(borrower.address);
  });

  it("getPositionRiskSummary matches HF monotonicity after accrual", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H7", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);
    await pool.connect(borrower).deposit(tokenId, 45n, ethers.parseEther("200"));

    const s0 = await pool.getPositionRiskSummary(tokenId);
    expect(s0.band).to.equal(1n);

    await ethers.provider.send("evm_increaseTime", [60 * 24 * 3600]);
    await ethers.provider.send("evm_mine", []);

    const s1 = await pool.getPositionRiskSummary(tokenId);
    expect(s1.totalOwed).to.be.gt(s0.totalOwed);
    expect(s1.hfWad).to.be.lt(s0.hfWad);
  });

  it("per-class collateral bases produce different HF at same borrow amount (Helium vs Hivemapper)", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tHelium = await registerVerifiedDevice(nft, borrower, deployer, "CL0", 0);
    const tHive = await registerVerifiedDevice(nft, borrower, deployer, "CL1", 1);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);

    const amt = ethers.parseEther("100");
    await pool.connect(borrower).deposit(tHelium, 50n, amt);
    await pool.connect(borrower).deposit(tHive, 50n, amt);

    const hfH = await pool.getHealthFactorWad(tHelium);
    const hfM = await pool.getHealthFactorWad(tHive);
    expect(hfM).to.be.gt(hfH);
  });

  it("repay on empty position reverts NoPosition", async function () {
    const { borrower, pool, nft } = await deployFixture();
    await expectRevertCustomError(pool.connect(borrower).repay(999n), pool.interface, "NoPosition");
  });

  it("accrueInterest increases accrued buckets after time passes", async function () {
    const { deployer, borrower, pool, nft } = await deployFixture();
    const tokenId = await registerVerifiedDevice(nft, borrower, deployer, "H8", 0);
    await nft.connect(borrower).setApprovalForAll(await pool.getAddress(), true);
    await pool.connect(borrower).deposit(tokenId, 50n, ethers.parseEther("80"));

    await ethers.provider.send("evm_increaseTime", [10 * 24 * 3600]);
    await ethers.provider.send("evm_mine", []);

    await pool.accrueInterest(tokenId);
    const p = await pool.positions(tokenId);
    expect(p.accruedLpInterest + p.accruedProtocolInterest).to.be.gt(0n);
  });
});
