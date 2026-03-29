import type { ClassFeeProfile } from "@/constants/deviceFees";

const BPS = 10_000;

/** Parity with `MACHStaking` on-chain tiers (MACH amount, 18 decimals), if 1 MACH ≈ $1 in UI. */
export const MACH_STAKE_TIER_THRESHOLDS_MACH = [2500, 10_000, 50_000] as const;

/** MACH staking reduces origination fee (bps off origination only), capped. */
export function machOriginationDiscountBps(stakedMachUsd: number): number {
  if (stakedMachUsd >= 50_000) return 15;
  if (stakedMachUsd >= 10_000) return 10;
  if (stakedMachUsd >= 2_500) return 5;
  return 0;
}

export function applyBpsDiscount(baseBps: number, discountBps: number): number {
  return Math.max(0, baseBps - discountBps);
}

export function feeUsdFromPrincipal(principalUsd: number, feeBps: number): number {
  return (principalUsd * feeBps) / BPS;
}

export interface BorrowQuoteFees {
  originationBps: number;
  verificationBps: number;
  originationUsd: number;
  verificationUsd: number;
  totalFeesUsd: number;
  netDisbursementUsd: number;
  protocolSpreadBps: number;
}

export function computeBorrowQuoteFees(
  principalUsd: number,
  profile: ClassFeeProfile,
  opts?: { premium?: boolean; stakedMachUsd?: number }
): BorrowQuoteFees {
  const machDisc = machOriginationDiscountBps(opts?.stakedMachUsd ?? 0);
  const origBps = applyBpsDiscount(profile.originationFeeBps, machDisc);
  let verifyBps = profile.verificationFeeBps;
  if (opts?.premium) {
    verifyBps = applyBpsDiscount(verifyBps, profile.verificationFeeDiscountBpsPremium);
  }
  const origUsd = feeUsdFromPrincipal(principalUsd, origBps);
  const verifyUsd = feeUsdFromPrincipal(principalUsd, verifyBps);
  const totalFees = origUsd + verifyUsd;
  return {
    originationBps: origBps,
    verificationBps: verifyBps,
    originationUsd: origUsd,
    verificationUsd: verifyUsd,
    totalFeesUsd: totalFees,
    netDisbursementUsd: Math.max(0, principalUsd - totalFees),
    protocolSpreadBps: profile.borrowerAprBps - profile.lenderAprBps,
  };
}

/** Simple interest over `days` at borrower APR (for UI projection). */
export function interestUsdLinear(principalUsd: number, borrowerAprBps: number, days: number): number {
  const annual = (principalUsd * borrowerAprBps) / BPS;
  return (annual * days) / 365;
}

export function lenderInterestUsdLinear(principalUsd: number, lenderAprBps: number, days: number): number {
  const annual = (principalUsd * lenderAprBps) / BPS;
  return (annual * days) / 365;
}

export function protocolInterestShareUsd(principalUsd: number, profile: ClassFeeProfile, days: number): number {
  const br = interestUsdLinear(principalUsd, profile.borrowerAprBps, days);
  const lr = lenderInterestUsdLinear(principalUsd, profile.lenderAprBps, days);
  return Math.max(0, br - lr);
}

/** Estimated liquidation protocol fee on outstanding debt + accrued interest (UI). */
export function liquidationProtocolFeeUsd(totalOwedUsd: number, liquidationFeeBps: number): number {
  return (totalOwedUsd * liquidationFeeBps) / BPS;
}

export function formatBps(bps: number, digits = 2): string {
  return `${(bps / 100).toFixed(digits)}%`;
}

/** B2B list price helpers (monthly USD, demo). */
export const B2B_INTEGRATION_TIERS = [
  { id: "api_starter", name: "DePIN API (starter)", monthlyUsd: 499 },
  { id: "analytics_pro", name: "Operator analytics Pro", monthlyUsd: 1_499 },
  { id: "white_label", name: "White-label risk console", monthlyUsd: 4_999 },
] as const;
