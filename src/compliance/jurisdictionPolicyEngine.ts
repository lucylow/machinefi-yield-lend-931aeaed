import { resolveJurisdictionLevel } from "./jurisdictionPolicyConfig";
import type { ComplianceTier, FeatureGateResult, JurisdictionLevel, PolicyEvaluationInput, ProductFeature } from "./types";

function tierEligibleForInstitutional(tier: ComplianceTier, input: PolicyEvaluationInput): { ok: boolean; reason?: string } {
  if (tier !== "institutional") return { ok: false, reason: "Enable institutional mode in the compliance menu." };
  const k = input.kycAml;
  if (k.kycStatus !== "approved") return { ok: false, reason: "Institutional pools require completed KYC (adapter not satisfied)." };
  if (k.amlStatus === "flagged") return { ok: false, reason: "AML status blocks institutional access." };
  if (k.sanctionsStatus === "match") return { ok: false, reason: "Sanctions screening must clear for institutional features." };
  if (!k.accreditationOk || !k.sourceOfFundsOk) return { ok: false, reason: "Accreditation and source-of-funds checks are required." };
  return { ok: true };
}

function baseLevelResult(level: JurisdictionLevel, feature: ProductFeature): Omit<FeatureGateResult, "requiresDisclosureIds"> {
  if (feature === "read_only") {
    if (level === "blocked") {
      return {
        allowed: true,
        mode: "warn",
        message: "Your region is flagged as high risk. Browse in read-only mode; on-chain actions may be unavailable.",
        recoveryHint: "Consult local counsel before using DeFi/RWA protocols.",
      };
    }
    return { allowed: true, mode: "ok", message: "" };
  }

  if (level === "blocked") {
    return {
      allowed: false,
      mode: "blocked",
      message: "Borrowing and device registration are unavailable for your selected region under current policy.",
      recoveryHint: "You can still review public protocol data. Policy updates are published by governance.",
    };
  }

  if (level === "restricted") {
    if (feature === "borrow" || feature === "join_pool" || feature === "institutional_pool") {
      return {
        allowed: false,
        mode: "blocked",
        message: "This action is restricted in your region. Read-only access remains available.",
        recoveryHint: "Select a different profile or confirm jurisdiction with your advisor.",
      };
    }
    return {
      allowed: true,
      mode: "needs_ack",
      message: "Your region is subject to additional disclosures before proceeding.",
      recoveryHint: "Acknowledge jurisdictional risk to continue.",
    };
  }

  if (level === "warning") {
    return {
      allowed: true,
      mode: feature === "borrow" || feature === "institutional_pool" ? "needs_ack" : "warn",
      message: "Your region has elevated regulatory or tax complexity — review risks before continuing.",
      recoveryHint: "Complete the risk acknowledgment for this action.",
    };
  }

  if (level === "unknown") {
    return {
      allowed: true,
      mode: "needs_ack",
      message: "Jurisdiction not confirmed. Declare your country for accurate policy, or proceed only after reading general risks.",
      recoveryHint: "Choose your country in the banner above.",
    };
  }

  return { allowed: true, mode: "ok", message: "" };
}

const DISCLOSURE_BY_FEATURE: Partial<Record<ProductFeature, string[]>> = {
  borrow: ["borrow_risks", "non_custodial_posture", "jurisdiction_general"],
  register_device: ["device_operation", "non_custodial_posture", "jurisdiction_general"],
  refresh_proof: ["device_operation", "proof_obligations"],
  institutional_pool: ["borrow_risks", "institutional_only", "non_custodial_posture"],
  join_pool: ["borrow_risks", "non_custodial_posture"],
  repay: ["non_custodial_posture"],
  transfer_position: ["borrow_risks", "non_custodial_posture"],
};

/**
 * Evaluates centralized policy: jurisdiction × feature × tier × KYC snapshot.
 */
export function evaluatePolicy(input: PolicyEvaluationInput): FeatureGateResult {
  const level = resolveJurisdictionLevel(input.countryCode);

  if (input.feature === "institutional_pool") {
    const inst = tierEligibleForInstitutional(input.tier, input);
    if (!inst.ok) {
      return {
        allowed: false,
        mode: "blocked",
        message: inst.reason ?? "Institutional access denied.",
        recoveryHint: "Complete institutional verification or use retail paths.",
      };
    }
  }

  const base = baseLevelResult(level, input.feature);

  if (!base.allowed || base.mode === "blocked") {
    return { ...base, requiresDisclosureIds: undefined };
  }

  const needsMandatoryDisclosure =
    base.mode === "needs_ack" ||
    input.feature === "borrow" ||
    input.feature === "institutional_pool" ||
    input.feature === "register_device" ||
    input.feature === "refresh_proof" ||
    input.feature === "join_pool" ||
    input.feature === "transfer_position";

  if (needsMandatoryDisclosure) {
    const ids = DISCLOSURE_BY_FEATURE[input.feature] ?? ["non_custodial_posture"];
    return { ...base, requiresDisclosureIds: ids };
  }

  if (base.mode === "warn" && base.message) {
    return { ...base };
  }

  return { allowed: true, mode: "ok", message: "", requiresDisclosureIds: undefined };
}

export function describeJurisdictionForUi(level: JurisdictionLevel): string {
  switch (level) {
    case "allowed":
      return "Low friction — standard disclosures apply.";
    case "warning":
      return "Monitor — extra risk copy and acknowledgments may be required.";
    case "restricted":
      return "Restricted — some features blocked; others need explicit acknowledgment.";
    case "blocked":
      return "Blocked — sensitive protocol actions disabled for this policy profile.";
    default:
      return "Unknown — confirm jurisdiction for tailored policy.";
  }
}
