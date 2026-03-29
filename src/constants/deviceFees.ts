/**
 * Device-class fee profiles (mirrors `LendingPool.classFees` defaults on-chain).
 * Helium: burstier yield → higher origination / liquidation. Tesla: smoother → tighter fees.
 */
export type DeviceClassKey = "helium" | "hivemapper" | "tesla" | "custom" | "depin";

export interface ClassFeeProfile {
  label: string;
  originationFeeBps: number;
  verificationFeeBps: number;
  borrowerAprBps: number;
  lenderAprBps: number;
  liquidationFeeBps: number;
  /** Max LTV bonus for premium tier (demo UI only; on-chain is governance). */
  premiumCollateralFactorBonusBps: number;
  verificationFeeDiscountBpsPremium: number;
}

export const DEVICE_CLASS_PROFILES: Record<DeviceClassKey, ClassFeeProfile> = {
  helium: {
    label: "Helium hotspot",
    originationFeeBps: 60,
    verificationFeeBps: 25,
    borrowerAprBps: 900,
    lenderAprBps: 720,
    liquidationFeeBps: 80,
    premiumCollateralFactorBonusBps: 150,
    verificationFeeDiscountBpsPremium: 8,
  },
  hivemapper: {
    label: "Hivemapper dashcam",
    originationFeeBps: 45,
    verificationFeeBps: 20,
    borrowerAprBps: 800,
    lenderAprBps: 680,
    liquidationFeeBps: 60,
    premiumCollateralFactorBonusBps: 120,
    verificationFeeDiscountBpsPremium: 6,
  },
  tesla: {
    label: "EV / Tesla-class charger",
    originationFeeBps: 30,
    verificationFeeBps: 15,
    borrowerAprBps: 650,
    lenderAprBps: 580,
    liquidationFeeBps: 45,
    premiumCollateralFactorBonusBps: 100,
    verificationFeeDiscountBpsPremium: 5,
  },
  custom: {
    label: "Custom DePIN device",
    originationFeeBps: 50,
    verificationFeeBps: 25,
    borrowerAprBps: 800,
    lenderAprBps: 650,
    liquidationFeeBps: 70,
    premiumCollateralFactorBonusBps: 100,
    verificationFeeDiscountBpsPremium: 6,
  },
  depin: {
    label: "Generic DePIN node",
    originationFeeBps: 45,
    verificationFeeBps: 22,
    borrowerAprBps: 780,
    lenderAprBps: 660,
    liquidationFeeBps: 65,
    premiumCollateralFactorBonusBps: 120,
    verificationFeeDiscountBpsPremium: 6,
  },
};

const ROUTE_TO_CLASS: Record<string, DeviceClassKey> = {
  helium: "helium",
  hivemapper: "hivemapper",
  hive: "hivemapper",
  tesla: "tesla",
  ev: "tesla",
  charger: "tesla",
  custom: "custom",
  depin: "depin",
};

export function resolveDeviceClassFromRoute(type: string | undefined): DeviceClassKey {
  if (!type) return "depin";
  const key = type.toLowerCase().replace(/\s+/g, "_");
  return ROUTE_TO_CLASS[key] ?? "depin";
}

/** Default revenue split after fees hit RevenueRouter (basis points, sums to 10_000). */
export const DEFAULT_FEE_ROUTING_BPS = {
  liquidityProviders: 3500,
  treasury: 2800,
  machStakers: 2200,
  insuranceReserve: 1000,
  growthFund: 500,
} as const;

/** Treasury sub-buckets as % of treasury share (narrative / reporting). */
export const TREASURY_BUCKET_BPS = {
  protocolRevenue: 3000,
  reserveCapital: 3500,
  operationalBudget: 1500,
  incentivesBudget: 1000,
  insuranceBackstop: 1000,
} as const;
