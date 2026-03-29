import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Tokenomics (§13): revenue, treasury, MACH staking, fee preview", function () {
  it("RevenueRouter splits fees with bounded normal allocation and shifts under conservative mode", async function () {
    const [admin, lp, treas, stake, ins, growth, reporter] = await ethers.getSigners();
    const stable = await ethers.deployContract("MockERC20", [], admin);
    const router = await ethers.deployContract(
      "RevenueRouter",
      [
        await stable.getAddress(),
        admin.address,
        lp.address,
        treas.address,
        stake.address,
        ins.address,
        growth.address,
      ],
      admin,
    );
    await router.waitForDeployment();
    await stable.mint(reporter.address, ethers.parseEther("10000"));
    await stable.connect(reporter).approve(await router.getAddress(), ethers.MaxUint256);
    await router.grantRole(await router.FEE_REPORTER_ROLE(), reporter.address);

    const amount = 10_000n;
    await router.connect(reporter).routeFee(0 /* Origination */, amount); // enum 0

    const a = await router.allocation();
    const toLp = (amount * a.lp) / 10000n;
    const toTreasury = (amount * a.treasury) / 10000n;
    expect(await stable.balanceOf(lp.address)).to.equal(toLp);
    expect(await stable.balanceOf(treas.address)).to.equal(toTreasury);

    await router.connect(admin).setConservativeRevenueMode(true);
    await stable.mint(reporter.address, amount);
    const snap = await router.stressAllocation();
    await router.connect(reporter).routeFee(1 /* InterestSpread */, amount);
    const toLp2 = (amount * snap.lp) / 10000n;
    expect(await stable.balanceOf(lp.address)).to.equal(toLp + toLp2);
    expect(snap.lp).to.be.gt(a.lp);
  });

  it("rejects normal allocation that violates LP / insurance floors or growth cap", async function () {
    const [admin, a1, a2, a3, a4, a5] = await ethers.getSigners();
    const stable = await ethers.deployContract("MockERC20", [], admin);
    const router = await ethers.deployContract(
      "RevenueRouter",
      [await stable.getAddress(), admin.address, a1.address, a2.address, a3.address, a4.address, a5.address],
      admin,
    );
    const bad = [
      [2000, 3000, 2000, 2000, 1000],
      [4000, 2000, 2000, 500, 1500],
      [2500, 2500, 2000, 1200, 1800], // sum 10_000, growth 1800 > MAX_GROWTH_BPS_NORMAL
    ];
    for (let i = 0; i < bad.length; i++) {
      const a = bad[i];
      try {
        await router.connect(admin).setAllocation(a[0], a[1], a[2], a[3], a[4]);
        expect.fail("expected revert");
      } catch (e) {
        const msg = String(e?.message ?? e);
        expect(msg.includes("safety floor") || msg.includes("growth cap")).to.equal(true, msg);
      }
    }
  });

  it("TreasuryHub credits categories from router pull", async function () {
    const [admin, lp, treas, stake, ins, growth, reporter] = await ethers.getSigners();
    const stable = await ethers.deployContract("MockERC20", [], admin);
    const router = await ethers.deployContract(
      "RevenueRouter",
      [
        await stable.getAddress(),
        admin.address,
        lp.address,
        treas.address,
        stake.address,
        ins.address,
        growth.address,
      ],
      admin,
    );
    await router.waitForDeployment();
    const hub = await ethers.deployContract(
      "TreasuryHub",
      [await stable.getAddress(), admin.address, await router.getAddress()],
      admin,
    );
    await hub.waitForDeployment();
    await router.connect(admin).setTreasuryHub(await hub.getAddress());

    await stable.mint(reporter.address, ethers.parseEther("10000"));
    await stable.connect(reporter).approve(await router.getAddress(), ethers.MaxUint256);
    await router.grantRole(await router.FEE_REPORTER_ROLE(), reporter.address);

    const amount = 100_000n;
    await router.connect(reporter).routeFee(0, amount);
    const a = await router.allocation();
    const toTreasury = (amount * a.treasury) / 10000n;
    const b = await hub.buckets();
    const pr = (toTreasury * b.protocolRevenue) / 10000n;
    expect(await hub.balanceOfCategory(0)).to.equal(pr);
    expect(await hub.totalBalance()).to.equal(toTreasury);
  });

  it("InsuranceReserve funds and governance coverShortfall", async function () {
    const [admin, donor, recipient] = await ethers.getSigners();
    const stable = await ethers.deployContract("MockERC20", [], admin);
    const reserve = await ethers.deployContract("InsuranceReserve", [await stable.getAddress(), admin.address], admin);
    await stable.mint(donor.address, 1000n);
    await stable.connect(donor).approve(await reserve.getAddress(), 500n);
    await reserve.connect(donor).fund(500n);
    expect(await reserve.balance()).to.equal(500n);
    await reserve.connect(admin).coverShortfall(recipient.address, 200n, "test shortfall");
    expect(await stable.balanceOf(recipient.address)).to.equal(200n);
    expect(await reserve.balance()).to.equal(300n);
  });

  it("MACHStaking tiers match LendingPool preview origination discount", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const mach = await ethers.deployContract("MACH", [ethers.parseEther("1000000")], deployer);
    const staking = await ethers.deployContract("MACHStaking", [await mach.getAddress(), deployer.address], deployer);
    const stable = await ethers.deployContract("MockERC20", [], deployer);
    const nft = await ethers.deployContract("HardwareNFT", [], deployer);
    const pool = await ethers.deployContract("LendingPool", [await stable.getAddress(), await nft.getAddress()], deployer);

    await pool.connect(deployer).setFeeDiscountModule(await staking.getAddress());

    const id = ethers.encodeBytes32String("D1");
    await nft.connect(borrower).registerDevice(id, 0, "gf://x", ethers.toUtf8Bytes("pk"));
    const tid = 1n;
    const principal = ethers.parseEther("10000");

    let p = await pool.previewOpenPositionFees(tid, principal, borrower.address);
    const discount0 = Array.isArray(p) ? p[3] : p.discountBps;
    expect(Number(discount0)).to.equal(0);

    await mach.connect(deployer).transfer(borrower.address, ethers.parseEther("3000"));
    await mach.connect(borrower).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(borrower).stake(ethers.parseEther("3000"));
    p = await pool.previewOpenPositionFees(tid, principal, borrower.address);
    const discount1 = Array.isArray(p) ? p[3] : p.discountBps;
    const effBps = Array.isArray(p) ? p[4] : p.effectiveOriginationFeeBps;
    expect(Number(discount1)).to.equal(5);
    expect(BigInt(effBps)).to.equal(55n); // class 0 origination 60 - 5
  });

  it("LiquidityEmissionController enforces cap", async function () {
    const [admin, mgr] = await ethers.getSigners();
    const c = await ethers.deployContract("LiquidityEmissionController", [admin.address, 1000n], admin);
    await c.grantRole(await c.INCENTIVE_MANAGER_ROLE(), mgr.address);
    await c.connect(mgr).recordIncentive(mgr.address, 400n);
    try {
      await c.connect(mgr).recordIncentive(mgr.address, 700n);
      expect.fail("expected revert");
    } catch (e) {
      expect(String(e?.message ?? e)).to.match(/LiquidityEmissionController: cap/);
    }
  });
});
