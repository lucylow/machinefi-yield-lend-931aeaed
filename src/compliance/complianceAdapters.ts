/**
 * Pluggable compliance adapter interfaces for institutional extensions.
 * Implementations live off-chain or in separate contracts; core lending stays permissionless.
 */

import type { ComplianceTier, KycAmlSnapshot, KycStatus } from "./types";

export interface IJurisdictionPolicy {
  readonly name: string;
  describe(countryCode: string): string;
}

export interface IComplianceAdapter {
  readonly name: string;
  snapshot(wallet: string): Promise<KycAmlSnapshot>;
}

export interface IKycProvider {
  readonly name: string;
  fetchStatus(wallet: string): Promise<KycStatus>;
}

export interface ISanctionsScreening {
  readonly name: string;
  screen(wallet: string): Promise<"clear" | "match" | "not_screened">;
}

export interface IInstitutionalEligibility {
  readonly name: string;
  isEligible(wallet: string, tier: ComplianceTier): Promise<boolean>;
}

/** Default retail adapter — no checks; returns permissive snapshot. */
export class NoOpComplianceAdapter implements IComplianceAdapter {
  readonly name = "noop_retail";

  async snapshot(_wallet: string): Promise<KycAmlSnapshot> {
    return {
      kycStatus: "none",
      amlStatus: "none",
      sanctionsStatus: "not_screened",
      accreditationOk: false,
      sourceOfFundsOk: false,
      travelRuleReady: false,
    };
  }
}

/** Demo institutional stub — flip to approved in dev only when env hints present. */
export class DemoInstitutionalAdapter implements IComplianceAdapter {
  readonly name = "demo_institutional";

  async snapshot(wallet: string): Promise<KycAmlSnapshot> {
    const magic =
      typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_COMPLIANCE_DEMO_INSTITUTIONAL === "true" &&
      wallet?.toLowerCase().startsWith("0x");
    return {
      kycStatus: magic ? "approved" : "none",
      amlStatus: magic ? "cleared" : "none",
      sanctionsStatus: magic ? "clear" : "not_screened",
      accreditationOk: !!magic,
      sourceOfFundsOk: !!magic,
      travelRuleReady: !!magic,
    };
  }
}

export function pickDefaultAdapter(tier: ComplianceTier): IComplianceAdapter {
  if (tier === "institutional") return new DemoInstitutionalAdapter();
  return new NoOpComplianceAdapter();
}
