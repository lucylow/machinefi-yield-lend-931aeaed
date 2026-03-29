import { LIQUIDATION_THRESHOLD_BPS } from "@/constants/addresses";

/** Max debt allowed at liquidation threshold (USD). */
export function maxDebtAtLiquidation(collateralUsd: number, liquidationThresholdBps = LIQUIDATION_THRESHOLD_BPS): number {
  return (collateralUsd * liquidationThresholdBps) / 10_000;
}

/**
 * Aave-style health factor: >1 safe, 1 at liquidation boundary, <1 liquidatable.
 * Returns Infinity when debt is zero.
 */
export function healthFactorFromUsd(
  collateralUsd: number,
  debtUsd: number,
  liquidationThresholdBps = LIQUIDATION_THRESHOLD_BPS
): number {
  if (debtUsd <= 0) return Number.POSITIVE_INFINITY;
  const maxDebt = maxDebtAtLiquidation(collateralUsd, liquidationThresholdBps);
  return maxDebt / debtUsd;
}

export type HealthBand = "safe" | "caution" | "danger";

export function healthBandFromFactor(hf: number): HealthBand {
  if (!Number.isFinite(hf)) return "safe";
  if (hf < 1.05) return "danger";
  if (hf < 1.15) return "caution";
  return "safe";
}

export function parseUsd(s: string): number {
  const n = Number.parseFloat(String(s).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
