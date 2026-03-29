/** Protocol-facing models (mock or on-chain backed). */

export type AssetType = "hardware" | "rwa";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type ProofVerificationStatus = "pending" | "accepted" | "rejected";

export type LoanHealthStatus = "safe" | "warning" | "critical";

export type LiquidationStatus = "none" | "eligible" | "queued" | "completed";

export interface ProtocolAsset {
  id: string;
  type: AssetType;
  owner: string;
  class: string;
  metadataUri: string;
  valueUsd: number;
  yieldAprBps: number;
  proofStatus: ProofVerificationStatus;
  lastProofAt: string;
  verificationStatus: VerificationStatus;
  collateralFactorBps: number;
  liquidationThresholdBps: number;
  currentLtvBps: number;
}

export interface ProtocolLoan {
  loanId: string;
  assetId: string;
  borrowedUsd: number;
  stablecoin: "USDC" | "USDT";
  startDate: string;
  interestRateBps: number;
  accruedInterestUsd: number;
  repaymentDue: string;
  currentLtvBps: number;
  healthStatus: LoanHealthStatus;
  liquidationStatus: LiquidationStatus;
}

export interface ProtocolProof {
  proofId: string;
  deviceId: string;
  proofType: string;
  source: string;
  timestamp: string;
  verificationStatus: ProofVerificationStatus;
  storageLocation: string;
  reference: string;
  confidenceBps: number;
}

export interface GovernanceProposal {
  proposalId: string;
  title: string;
  description: string;
  category: "risk" | "oracle" | "upgrade" | "other";
  /** High-level impact for operators / auditors (maps to on-chain proposal metadata in production). */
  riskImpact?: "low" | "medium" | "high";
  /** Which stack layer the change targets (§22). */
  chainScope?: "bsc_settlement" | "opbnb_update" | "greenfield_storage" | "cross_layer";
  votingStart: string;
  votingEnd: string;
  quorumBps: number;
  votesYes: number;
  votesNo: number;
  votesAbstain: number;
  executionStatus: "pending" | "queued" | "executed" | "failed";
  timelockStatus: "none" | "active" | "passed" | "expired";
}

export interface YieldHistoryPoint {
  at: string;
  yieldUsd: number;
  aprBps: number;
}

export interface RiskEvent {
  id: string;
  at: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

/** Governance-visible fee knobs (mirrors on-chain `LendingPool` / `RevenueRouter`). */
export interface FeeGovernanceSnapshot {
  lastUpdated: string;
  globalFeeRouting: {
    liquidityProvidersBps: number;
    treasuryBps: number;
    machStakersBps: number;
    insuranceReserveBps: number;
    growthFundBps: number;
  };
  treasuryBucketsBps: {
    protocolRevenue: number;
    reserveCapital: number;
    operational: number;
    incentives: number;
    insuranceBackstop: number;
  };
}

export type RevenueSourceKey =
  | "origination"
  | "interest_spread"
  | "liquidation"
  | "verification"
  | "b2b"
  | "treasury_yield"
  | "late_fee";

export interface RevenueBySourcePoint {
  source: RevenueSourceKey;
  label: string;
  amountUsd24h: number;
  amountUsd30d: number;
}

export interface TreasuryHealthSnapshot {
  reserveRatioBps: number;
  feesEarnedTodayUsd: number;
  feesEarned30dUsd: number;
  idleStableUsd: number;
  narrative: string;
}
