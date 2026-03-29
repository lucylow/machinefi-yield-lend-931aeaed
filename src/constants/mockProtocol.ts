import type {
  FeeGovernanceSnapshot,
  GovernanceProposal,
  ProtocolAsset,
  ProtocolLoan,
  ProtocolProof,
  RevenueBySourcePoint,
  RiskEvent,
  TreasuryHealthSnapshot,
  YieldHistoryPoint,
} from "@/types/protocol";
import { DEFAULT_FEE_ROUTING_BPS, TREASURY_BUCKET_BPS } from "@/constants/deviceFees";

/** Demo protocol totals for marketing / overview. */
export const PROTOCOL_OVERVIEW_STATS = {
  totalCollateralUsd: 12_400_000,
  totalBorrowedUsd: 4_100_000,
  activeDevices: 1280,
  liquidationThresholdBps: 8500, // 85% LTV liquidatable
  poolUtilizationBps: 6200,
} as const;

export const MOCK_GOVERNANCE_PROPOSALS: GovernanceProposal[] = [
  {
    proposalId: "MGP-13",
    title: "Shift RevenueRouter split: +200 bps to insurance, −200 bps growth",
    description:
      "Timelocked update to `RevenueRouter.setAllocation` reflecting higher backstop target after B2B onboarding. Does not change user collateral rules.",
    category: "risk",
    riskImpact: "medium",
    chainScope: "bsc_settlement",
    votingStart: "2026-03-27T12:00:00Z",
    votingEnd: "2026-04-03T12:00:00Z",
    quorumBps: 400,
    votesYes: 890_000,
    votesNo: 210_000,
    votesAbstain: 12_000,
    executionStatus: "pending",
    timelockStatus: "none",
  },
  {
    proposalId: "MGP-12",
    title: "Reduce Helium collateral factor by 200 bps",
    description:
      "Conservative haircut after oracle variance. Aligns pool risk with verified proof cadence on opBNB.",
    category: "risk",
    riskImpact: "high",
    chainScope: "cross_layer",
    votingStart: "2026-03-20T12:00:00Z",
    votingEnd: "2026-03-27T12:00:00Z",
    quorumBps: 400,
    votesYes: 1_240_000,
    votesNo: 320_000,
    votesAbstain: 45_000,
    executionStatus: "queued",
    timelockStatus: "active",
  },
  {
    proposalId: "MGP-11",
    title: "Whitelist secondary oracle feed (BSC)",
    description: "Add redundant price route for RWA device classes with dual attestation.",
    category: "oracle",
    riskImpact: "medium",
    chainScope: "bsc_settlement",
    votingStart: "2026-03-10T00:00:00Z",
    votingEnd: "2026-03-17T00:00:00Z",
    quorumBps: 400,
    votesYes: 2_010_000,
    votesNo: 120_000,
    votesAbstain: 80_000,
    executionStatus: "executed",
    timelockStatus: "passed",
  },
];

export const MOCK_YIELD_HISTORY: YieldHistoryPoint[] = [
  { at: "2026-01-01", yieldUsd: 118_000, aprBps: 780 },
  { at: "2026-02-01", yieldUsd: 122_400, aprBps: 810 },
  { at: "2026-03-01", yieldUsd: 128_200, aprBps: 795 },
];

export const MOCK_PROOFS: ProtocolProof[] = [
  {
    proofId: "prf-8f2a",
    deviceId: "dev-helium-001",
    proofType: "uptime_attestation",
    source: "opBNB indexer",
    timestamp: "2026-03-27T08:00:00Z",
    verificationStatus: "accepted",
    storageLocation: "greenfield://bucket/p/8f2a…",
    reference: "0x9c4e…21ab",
    confidenceBps: 9820,
  },
  {
    proofId: "prf-7aa1",
    deviceId: "dev-hive-014",
    proofType: "telemetry_bundle",
    source: "Greenfield CID",
    timestamp: "2026-03-26T14:22:00Z",
    verificationStatus: "pending",
    storageLocation: "bafybeig…",
    reference: "sig:ed25519…",
    confidenceBps: 0,
  },
];

export const MOCK_RISK_EVENTS: RiskEvent[] = [
  {
    id: "evt-1",
    at: "2026-03-26T18:00:00Z",
    severity: "info",
    message: "Oracle heartbeat within SLA; BSC settlement block finalized.",
  },
  {
    id: "evt-2",
    at: "2026-03-25T09:40:00Z",
    severity: "warning",
    message: "Stale proof on 3 devices — collateral marks haircut until refresh.",
  },
];

export const MOCK_ASSET_FOR_BORROW: ProtocolAsset = {
  id: "asset-demo-1",
  type: "hardware",
  owner: "0x0000…0000",
  class: "DePIN hotspot",
  metadataUri: "ipfs://…/meta.json",
  valueUsd: 5400,
  yieldAprBps: 820,
  proofStatus: "accepted",
  lastProofAt: "2026-03-27T08:00:00Z",
  verificationStatus: "verified",
  collateralFactorBps: 7000,
  liquidationThresholdBps: 8500,
  currentLtvBps: 0,
};

export const MOCK_FEE_GOVERNANCE: FeeGovernanceSnapshot = {
  lastUpdated: "2026-03-28T00:00:00Z",
  globalFeeRouting: {
    liquidityProvidersBps: DEFAULT_FEE_ROUTING_BPS.liquidityProviders,
    treasuryBps: DEFAULT_FEE_ROUTING_BPS.treasury,
    machStakersBps: DEFAULT_FEE_ROUTING_BPS.machStakers,
    insuranceReserveBps: DEFAULT_FEE_ROUTING_BPS.insuranceReserve,
    growthFundBps: DEFAULT_FEE_ROUTING_BPS.growthFund,
  },
  treasuryBucketsBps: {
    protocolRevenue: TREASURY_BUCKET_BPS.protocolRevenue,
    reserveCapital: TREASURY_BUCKET_BPS.reserveCapital,
    operational: TREASURY_BUCKET_BPS.operationalBudget,
    incentives: TREASURY_BUCKET_BPS.incentivesBudget,
    insuranceBackstop: TREASURY_BUCKET_BPS.insuranceBackstop,
  },
};

export const MOCK_REVENUE_BY_SOURCE: RevenueBySourcePoint[] = [
  { source: "origination", label: "Origination", amountUsd24h: 4_820, amountUsd30d: 128_400 },
  { source: "interest_spread", label: "Interest spread", amountUsd24h: 9_640, amountUsd30d: 276_200 },
  { source: "late_fee", label: "Credit line late fees", amountUsd24h: 620, amountUsd30d: 18_200 },
  { source: "liquidation", label: "Liquidation", amountUsd24h: 410, amountUsd30d: 6_900 },
  { source: "verification", label: "Verification", amountUsd24h: 1_120, amountUsd30d: 31_500 },
  { source: "b2b", label: "B2B / API", amountUsd24h: 2_800, amountUsd30d: 78_000 },
  { source: "treasury_yield", label: "Treasury yield", amountUsd24h: 1_950, amountUsd30d: 54_200 },
];

export const MOCK_TREASURY_HEALTH: TreasuryHealthSnapshot = {
  reserveRatioBps: 8720,
  feesEarnedTodayUsd: 18_740,
  feesEarned30dUsd: 512_000,
  idleStableUsd: 2_100_000,
  narrative:
    "Fees refill reserves and insurance first; a healthier backstop compresses borrower risk premia over time — the underwriting flywheel the UI explains at borrow time.",
};

export const MOCK_LOANS_DEMO: ProtocolLoan[] = [
  {
    loanId: "ln-1001",
    assetId: "asset-demo-1",
    borrowedUsd: 3200,
    stablecoin: "USDC",
    startDate: "2026-02-15T00:00:00Z",
    interestRateBps: 650,
    accruedInterestUsd: 42.18,
    repaymentDue: "2026-05-15T00:00:00Z",
    currentLtvBps: 6100,
    healthStatus: "safe",
    liquidationStatus: "none",
  },
];
