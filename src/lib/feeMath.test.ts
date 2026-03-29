import { describe, expect, it } from "vitest";
import { DEVICE_CLASS_PROFILES } from "@/constants/deviceFees";
import {
  applyBpsDiscount,
  computeBorrowQuoteFees,
  feeUsdFromPrincipal,
  interestUsdLinear,
  lenderInterestUsdLinear,
  liquidationProtocolFeeUsd,
  machOriginationDiscountBps,
  protocolInterestShareUsd,
} from "@/lib/feeMath";

describe("feeMath", () => {
  it("machOriginationDiscountBps tiers", () => {
    expect(machOriginationDiscountBps(0)).toBe(0);
    expect(machOriginationDiscountBps(2_500)).toBe(5);
    expect(machOriginationDiscountBps(10_000)).toBe(10);
    expect(machOriginationDiscountBps(50_000)).toBe(15);
  });

  it("applyBpsDiscount floors at zero", () => {
    expect(applyBpsDiscount(10, 12)).toBe(0);
    expect(applyBpsDiscount(50, 10)).toBe(40);
  });

  it("computeBorrowQuoteFees: net = principal − orig − verify", () => {
    const p = DEVICE_CLASS_PROFILES.helium;
    const q = computeBorrowQuoteFees(10_000, p, {});
    const expectedOrig = feeUsdFromPrincipal(10_000, p.originationFeeBps);
    const expectedVer = feeUsdFromPrincipal(10_000, p.verificationFeeBps);
    expect(q.originationUsd).toBeCloseTo(expectedOrig, 5);
    expect(q.verificationUsd).toBeCloseTo(expectedVer, 5);
    expect(q.totalFeesUsd).toBeCloseTo(expectedOrig + expectedVer, 5);
    expect(q.netDisbursementUsd).toBeCloseTo(10_000 - expectedOrig - expectedVer, 5);
    expect(q.protocolSpreadBps).toBe(p.borrowerAprBps - p.lenderAprBps);
  });

  it("MACH discount reduces origination bps in quote", () => {
    const p = DEVICE_CLASS_PROFILES.helium;
    const noDisc = computeBorrowQuoteFees(50_000, p, { stakedMachUsd: 0 });
    const disc = computeBorrowQuoteFees(50_000, p, { stakedMachUsd: 50_000 });
    expect(disc.originationBps).toBeLessThan(noDisc.originationBps);
    expect(disc.totalFeesUsd).toBeLessThan(noDisc.totalFeesUsd);
  });

  it("premium reduces verification bps", () => {
    const p = DEVICE_CLASS_PROFILES.hivemapper;
    const base = computeBorrowQuoteFees(20_000, p, { premium: false });
    const prem = computeBorrowQuoteFees(20_000, p, { premium: true });
    expect(prem.verificationBps).toBeLessThanOrEqual(base.verificationBps);
  });

  it("interest spread: borrower − lender = protocol share", () => {
    const p = DEVICE_CLASS_PROFILES.tesla;
    const principal = 25_000;
    const days = 30;
    const br = interestUsdLinear(principal, p.borrowerAprBps, days);
    const lr = lenderInterestUsdLinear(principal, p.lenderAprBps, days);
    const proto = protocolInterestShareUsd(principal, p, days);
    expect(proto).toBeCloseTo(br - lr, 4);
  });

  it("liquidationProtocolFeeUsd scales with bps", () => {
    expect(liquidationProtocolFeeUsd(10_000, 100)).toBe(100);
    expect(liquidationProtocolFeeUsd(10_000, 50)).toBe(50);
  });
});
