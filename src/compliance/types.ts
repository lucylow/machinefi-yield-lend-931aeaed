/** Product / policy classification — drives UI copy and gates (not legal advice). */
export type RwaClassification =
  | "unclassified"
  | "retail_eligible"
  | "verified_eligible"
  | "institutional_eligible"
  | "jurisdiction_restricted"
  | "feature_limited"
  | "compliance_blocked";

/** ISO 3166-1 alpha-2 upper; "__UNKNOWN__" when undeclared. */
export type CountryCode = string;

export type JurisdictionLevel = "allowed" | "warning" | "restricted" | "blocked" | "unknown";

export type ComplianceTier = "retail" | "verified" | "institutional";

export type ProductFeature =
  | "read_only"
  | "register_device"
  | "refresh_proof"
  | "borrow"
  | "repay"
  | "join_pool"
  | "institutional_pool"
  | "transfer_position";

export type KycStatus = "none" | "pending" | "approved" | "rejected";
export type AmlStatus = "none" | "cleared" | "flagged";
export type SanctionsStatus = "not_screened" | "clear" | "match";

export interface KycAmlSnapshot {
  kycStatus: KycStatus;
  amlStatus: AmlStatus;
  sanctionsStatus: SanctionsStatus;
  accreditationOk: boolean;
  sourceOfFundsOk: boolean;
  travelRuleReady: boolean;
}

export interface ComplianceProfile {
  tier: ComplianceTier;
  rwaClass: RwaClassification;
  kycAml: KycAmlSnapshot;
}

export type DisclosureState = "not_shown" | "shown" | "acknowledged" | "expired" | "re_acknowledgment_required";

export interface RiskDisclosure {
  type: string;
  version: string;
  title: string;
  bullets: string[];
}

export interface AttestationRecord {
  userAddress: string;
  attestationType: string;
  version: string;
  timestamp: number;
  jurisdiction: CountryCode;
  featureScope: string;
  acknowledgmentHash: string;
}

export type DisputeStateLabel =
  | "normal"
  | "under_review"
  | "disputed"
  | "escrowed"
  | "suspended"
  | "arbitration_pending"
  | "resolved"
  | "rejected";

export type MaintenanceOperationalLabel =
  | "normal"
  | "planned_maintenance"
  | "grace_period"
  | "degraded"
  | "haircut"
  | "liquidation_eligible";

/** Frontend-only mirror of on-chain / off-chain operational posture for UX. */
export interface MaintenanceState {
  label: MaintenanceOperationalLabel;
  maintenanceNoticeAt?: number;
  proofMissCount?: number;
  lastProofAt?: number;
}

export interface OwnershipClaimView {
  hardwareOwnerLabel: string;
  nftCustodyHolder: "user_wallet" | "lending_pool" | "other";
  claimHolder: string;
  claimLocked: boolean;
  loanBound: boolean;
  lienActive: boolean;
  transferRestricted: boolean;
  nonCustodialStablecoin: boolean;
}

export interface FeatureGateResult {
  allowed: boolean;
  mode: "ok" | "warn" | "blocked" | "needs_ack";
  message: string;
  recoveryHint?: string;
  requiresDisclosureIds?: string[];
}

export interface PolicyEvaluationInput {
  countryCode: CountryCode;
  feature: ProductFeature;
  tier: ComplianceTier;
  kycAml: KycAmlSnapshot;
}

export const POLICY_CONFIG_VERSION = "2026-03-28";
export const DISCLOSURE_PACK_VERSION = "2026-03-28";
