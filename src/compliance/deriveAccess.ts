import { evaluatePolicy } from "./jurisdictionPolicyEngine";
import { hasAcknowledgedDisclosureSet } from "./attestationStorage";
import { resolveJurisdictionLevel } from "./jurisdictionPolicyConfig";
import type { ComplianceProfile, CountryCode, FeatureGateResult, ProductFeature } from "./types";
import { DISCLOSURE_PACK_VERSION } from "./types";

export interface DerivedAccessInput {
  countryCode: CountryCode;
  profile: ComplianceProfile;
  feature: ProductFeature;
  walletAddress: string | null;
}

/**
 * Combines policy engine + local disclosure acknowledgments for actionable UI gates.
 */
export function deriveFeatureAccess(input: DerivedAccessInput): FeatureGateResult {
  const base = evaluatePolicy({
    countryCode: input.countryCode,
    feature: input.feature,
    tier: input.profile.tier,
    kycAml: input.profile.kycAml,
  });

  if (!base.allowed || base.mode === "blocked") return base;

  const needs = base.requiresDisclosureIds ?? [];
  if (needs.length === 0) return base;

  if (!input.walletAddress) {
    return {
      ...base,
      allowed: false,
      mode: "blocked",
      message: "Connect a wallet to record mandatory acknowledgments for this action.",
    };
  }

  const ok = hasAcknowledgedDisclosureSet(input.walletAddress, needs, DISCLOSURE_PACK_VERSION);
  if (ok) {
    return { allowed: true, mode: "ok", message: "" };
  }

  return {
    allowed: false,
    mode: "needs_ack",
    message: base.message || "Review and acknowledge the risk disclosures to continue.",
    recoveryHint: "Open the disclosure panel and confirm each item.",
    requiresDisclosureIds: needs,
  };
}

export function rwaClassForTier(
  countryCode: CountryCode,
  tier: ComplianceProfile["tier"]
): ComplianceProfile["rwaClass"] {
  const level = resolveJurisdictionLevel(countryCode);
  if (level === "blocked") return "compliance_blocked";
  if (level === "restricted") return "jurisdiction_restricted";
  if (tier === "institutional") return "institutional_eligible";
  if (tier === "verified") return "verified_eligible";
  return "retail_eligible";
}
