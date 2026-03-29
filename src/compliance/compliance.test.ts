import { describe, it, expect, beforeEach } from "vitest";
import { evaluatePolicy, describeJurisdictionForUi } from "./jurisdictionPolicyEngine";
import {
  acknowledgeDisclosureSet,
  getAttestation,
  hasAcknowledgedDisclosureSet,
  isAnnualAttestationFresh,
  recordAttestation,
} from "./attestationStorage";
import { deriveFeatureAccess } from "./deriveAccess";
import type { ComplianceProfile } from "./types";
import { DISCLOSURE_PACK_VERSION } from "./types";

const retailProfile: ComplianceProfile = {
  tier: "retail",
  rwaClass: "retail_eligible",
  kycAml: {
    kycStatus: "none",
    amlStatus: "none",
    sanctionsStatus: "not_screened",
    accreditationOk: false,
    sourceOfFundsOk: false,
    travelRuleReady: false,
  },
};

describe("jurisdictionPolicyEngine", () => {
  it("blocks borrow in blocked jurisdictions", () => {
    const r = evaluatePolicy({ countryCode: "RU", feature: "borrow", tier: "retail", kycAml: retailProfile.kycAml });
    expect(r.allowed).toBe(false);
    expect(r.mode).toBe("blocked");
  });

  it("allows read-only in blocked jurisdictions with warning", () => {
    const r = evaluatePolicy({ countryCode: "KP", feature: "read_only", tier: "retail", kycAml: retailProfile.kycAml });
    expect(r.allowed).toBe(true);
    expect(r.mode).toBe("warn");
  });

  it("requires disclosures for borrow in allowed DE", () => {
    const r = evaluatePolicy({ countryCode: "DE", feature: "borrow", tier: "retail", kycAml: retailProfile.kycAml });
    expect(r.requiresDisclosureIds?.length).toBeGreaterThan(0);
  });

  it("blocks institutional pool without KYC", () => {
    const r = evaluatePolicy({
      countryCode: "DE",
      feature: "institutional_pool",
      tier: "institutional",
      kycAml: retailProfile.kycAml,
    });
    expect(r.allowed).toBe(false);
  });

  it("describeJurisdictionForUi is stable", () => {
    expect(describeJurisdictionForUi("unknown").length).toBeGreaterThan(10);
  });
});

describe("attestationStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves attestations", () => {
    recordAttestation({
      userAddress: "0xabc",
      attestationType: "test",
      version: DISCLOSURE_PACK_VERSION,
      timestamp: Date.now(),
      jurisdiction: "DE",
      featureScope: "x",
      body: "payload",
    });
    const a = getAttestation("0xabc", "test", DISCLOSURE_PACK_VERSION);
    expect(a?.userAddress).toBe("0xabc");
  });

  it("hasAcknowledgedDisclosureSet respects all ids", () => {
    acknowledgeDisclosureSet("0xw", ["borrow_risks", "non_custodial_posture"], "US", DISCLOSURE_PACK_VERSION);
    expect(hasAcknowledgedDisclosureSet("0xw", ["borrow_risks", "non_custodial_posture"], DISCLOSURE_PACK_VERSION)).toBe(
      true
    );
    expect(hasAcknowledgedDisclosureSet("0xw", ["borrow_risks"], DISCLOSURE_PACK_VERSION)).toBe(true);
    expect(hasAcknowledgedDisclosureSet("0xw", ["institutional_only"], DISCLOSURE_PACK_VERSION)).toBe(false);
  });

  it("annual attestation expires", () => {
    const old = Date.now() - 400 * 24 * 60 * 60 * 1000;
    recordAttestation({
      userAddress: "0xold",
      attestationType: "annual_risk",
      version: DISCLOSURE_PACK_VERSION,
      timestamp: old,
      jurisdiction: "DE",
      featureScope: "annual",
      body: "a",
    });
    expect(isAnnualAttestationFresh("0xold", "DE", 365 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});

describe("deriveFeatureAccess", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("blocks borrow without wallet for disclosure recording", () => {
    const r = deriveFeatureAccess({
      countryCode: "DE",
      profile: retailProfile,
      feature: "borrow",
      walletAddress: null,
    });
    expect(r.allowed).toBe(false);
  });

  it("unblocks after disclosure acknowledgment", () => {
    const wallet = "0xuser";
    acknowledgeDisclosureSet(wallet, ["borrow_risks", "non_custodial_posture", "jurisdiction_general"], "DE", DISCLOSURE_PACK_VERSION);
    const r = deriveFeatureAccess({
      countryCode: "DE",
      profile: retailProfile,
      feature: "borrow",
      walletAddress: wallet,
    });
    expect(r.allowed).toBe(true);
  });
});
