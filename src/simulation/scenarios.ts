import type { MockVolatilityLevel } from "@/constants/mockConfig";

export type DemoScenarioId = "healthy" | "high_leverage" | "at_risk" | "liquidated";

export interface ScenarioLoanSeed {
  nftId: number;
  principalUsd: number;
  accruedInterestUsd: number;
  borrowAprBps: number;
  status: "active" | "repaid" | "liquidated";
}

export interface ScenarioDeviceSeed {
  id: number;
  deviceId: string;
  typeLabel: string;
  kind: "helium" | "hivemapper" | "ev" | "custom";
  baseYieldAprBps: number;
  uptimeBps: number;
  confidenceBps: number;
}

export interface ScenarioSeed {
  id: DemoScenarioId;
  label: string;
  description: string;
  poolLiquidityUsd: number;
  reserveFactorBps: number;
  /** Protocol-wide marketing totals (shadow book + your devices are layered on top for consistency). */
  overviewAnchors: {
    totalCollateralUsd: number;
    totalBorrowedUsd: number;
    activeDevices: number;
  };
  devices: ScenarioDeviceSeed[];
  loans: ScenarioLoanSeed[];
}

const helium = (id: number, suffix: string): ScenarioDeviceSeed => ({
  id,
  deviceId: `0xhelium${suffix}`,
  typeLabel: "Helium Hotspot",
  kind: "helium",
  baseYieldAprBps: 780,
  uptimeBps: 9850,
  confidenceBps: 9650,
});

const hive = (id: number, suffix: string): ScenarioDeviceSeed => ({
  id,
  deviceId: `0xhive${suffix}`,
  typeLabel: "Hivemapper Dashcam",
  kind: "hivemapper",
  baseYieldAprBps: 920,
  uptimeBps: 9420,
  confidenceBps: 9100,
});

const ev = (id: number, suffix: string): ScenarioDeviceSeed => ({
  id,
  deviceId: `0xev${suffix}`,
  typeLabel: "EV Charger (DePIN)",
  kind: "ev",
  baseYieldAprBps: 1100,
  uptimeBps: 9180,
  confidenceBps: 8800,
});

export const DEMO_SCENARIOS: Record<DemoScenarioId, ScenarioSeed> = {
  healthy: {
    id: "healthy",
    label: "Healthy portfolio",
    description: "Moderate leverage, fresh proofs, stable yield.",
    poolLiquidityUsd: 12_800_000,
    reserveFactorBps: 1500,
    devices: [helium(1, "001"), hive(2, "014"), ev(3, "charger01")],
    loans: [
      { nftId: 1, principalUsd: 2850, accruedInterestUsd: 38.2, borrowAprBps: 920, status: "active" },
      { nftId: 2, principalUsd: 4980, accruedInterestUsd: 71.5, borrowAprBps: 940, status: "active" },
    ],
  },
  high_leverage: {
    id: "high_leverage",
    label: "High leverage",
    description: "Pushes LTV toward policy caps — health factor tighter.",
    poolLiquidityUsd: 11_200_000,
    reserveFactorBps: 1800,
    overviewAnchors: {
      totalCollateralUsd: 11_900_000,
      totalBorrowedUsd: 4_450_000,
      activeDevices: 1190,
    },
    devices: [helium(1, "001"), hive(2, "014")],
    loans: [
      { nftId: 1, principalUsd: 4100, accruedInterestUsd: 52.1, borrowAprBps: 980, status: "active" },
      { nftId: 2, principalUsd: 6200, accruedInterestUsd: 98.4, borrowAprBps: 1000, status: "active" },
    ],
  },
  at_risk: {
    id: "at_risk",
    label: "At risk",
    description: "Stale proofs and softer marks — warning band on health.",
    poolLiquidityUsd: 10_500_000,
    reserveFactorBps: 2000,
    overviewAnchors: {
      totalCollateralUsd: 11_200_000,
      totalBorrowedUsd: 4_520_000,
      activeDevices: 1155,
    },
    devices: [
      { ...helium(1, "001"), uptimeBps: 8220, confidenceBps: 7800, baseYieldAprBps: 620 },
      { ...hive(2, "014"), uptimeBps: 7980, confidenceBps: 7600, baseYieldAprBps: 710 },
    ],
    loans: [
      { nftId: 1, principalUsd: 3600, accruedInterestUsd: 112.3, borrowAprBps: 1050, status: "active" },
      { nftId: 2, principalUsd: 5400, accruedInterestUsd: 168.9, borrowAprBps: 1080, status: "active" },
    ],
  },
  liquidated: {
    id: "liquidated",
    label: "Liquidated (historical)",
    description: "One position already cleared; remaining book is conservative.",
    poolLiquidityUsd: 13_100_000,
    reserveFactorBps: 1600,
    overviewAnchors: {
      totalCollateralUsd: 12_550_000,
      totalBorrowedUsd: 3_980_000,
      activeDevices: 1265,
    },
    devices: [helium(1, "001"), hive(2, "014"), ev(3, "charger01")],
    loans: [
      { nftId: 1, principalUsd: 2100, accruedInterestUsd: 24.8, borrowAprBps: 900, status: "active" },
      { nftId: 2, principalUsd: 0, accruedInterestUsd: 0, borrowAprBps: 900, status: "liquidated" },
    ],
  },
};

export function volatilityNoiseAmplitude(v: MockVolatilityLevel): number {
  switch (v) {
    case "low":
      return 0.35;
    case "high":
      return 1.85;
    default:
      return 1;
  }
}
