/** Wallet-facing portfolio rows (on-chain or simulation-backed). */

export interface LoanPosition {
  nftId: number;
  /** Total debt including accrued interest (USD, string for display). */
  debt: string;
  principalUsd: number;
  accruedInterestUsd: number;
  collateralValue: string;
  /** Loan-to-value percentage 0–100. */
  ltv: number;
  yieldPercentage: number;
  deviceType: string;
  status: "active" | "repaid" | "liquidated";
  /** Aave-style health factor; Infinity when no debt. */
  healthFactor: number;
  healthLabel: "safe" | "warning" | "critical";
  liquidationEligible: boolean;
  borrowAprBps: number;
  assetId: string;
}

export type DeviceSimStatus = "active" | "inactive" | "stale";

export interface HardwareDevice {
  id: number;
  deviceId: string;
  type: string;
  registrationTime: number;
  lastProofTimestamp: number;
  isActive: boolean;
  monthlyYield: number;
  yieldAprBps: number;
  uptimeBps: number;
  confidenceBps: number;
  simStatus: DeviceSimStatus;
}
