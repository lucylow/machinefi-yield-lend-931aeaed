import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import {
  pickDefaultAdapter,
  type ComplianceProfile,
  type ComplianceTier,
  type CountryCode,
  type FeatureGateResult,
  type MaintenanceOperationalLabel,
  type ProductFeature,
  DISCLOSURE_PACK_VERSION,
} from "@/compliance";
import {
  acknowledgeDisclosureSet,
  isAnnualAttestationFresh,
  recordAttestation,
} from "@/compliance/attestationStorage";
import { deriveFeatureAccess, rwaClassForTier } from "@/compliance/deriveAccess";
import { resolveJurisdictionLevel } from "@/compliance/jurisdictionPolicyConfig";
import { describeJurisdictionForUi } from "@/compliance/jurisdictionPolicyEngine";
import { getLoadErrorMessage } from "@/lib/errors";

interface ComplianceContextValue {
  countryCode: CountryCode;
  setCountryCode: (c: CountryCode) => void;
  tier: ComplianceTier;
  setTier: (t: ComplianceTier) => void;
  profile: ComplianceProfile;
  jurisdictionLevel: ReturnType<typeof resolveJurisdictionLevel>;
  jurisdictionDescription: string;
  annualAttestationFresh: boolean;
  recordAnnualAttestation: () => void;
  refreshComplianceSnapshot: () => Promise<void>;
  gateFor: (feature: ProductFeature) => FeatureGateResult;
  acknowledgeCurrentDisclosures: (ids: string[]) => void;
  /** Demo UX: simulated operational / dispute flags for banners */
  maintenanceLabel: MaintenanceOperationalLabel;
  setMaintenanceLabel: (m: MaintenanceOperationalLabel) => void;
  disputeBlocksUx: boolean;
  setDisputeBlocksUx: (v: boolean) => void;
}

const ComplianceContext = createContext<ComplianceContextValue | null>(null);

const DEFAULT_COUNTRY: CountryCode = "__UNKNOWN__";

export const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address } = useWeb3();
  const [countryCode, setCountryCode] = useState<CountryCode>(() => {
    try {
      return (localStorage.getItem("mfl_country_v1") as CountryCode) || DEFAULT_COUNTRY;
    } catch {
      return DEFAULT_COUNTRY;
    }
  });
  const [tier, setTier] = useState<ComplianceTier>("retail");
  const [kycSnapshot, setKycSnapshot] = useState<ComplianceProfile["kycAml"]>({
    kycStatus: "none",
    amlStatus: "none",
    sanctionsStatus: "not_screened",
    accreditationOk: false,
    sourceOfFundsOk: false,
    travelRuleReady: false,
  });
  const [maintenanceLabel, setMaintenanceLabel] = useState<MaintenanceOperationalLabel>("normal");
  const [disputeBlocksUx, setDisputeBlocksUx] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("mfl_country_v1", countryCode);
    } catch {
      /* ignore */
    }
  }, [countryCode]);

  const refreshComplianceSnapshot = useCallback(async () => {
    try {
      const adapter = pickDefaultAdapter(tier);
      const snap = await adapter.snapshot(address ?? "0x0000000000000000000000000000000000000000");
      setKycSnapshot(snap);
    } catch (err: unknown) {
      console.warn(
        "[Compliance] Snapshot refresh failed:",
        getLoadErrorMessage(err, "Could not refresh compliance snapshot.")
      );
    }
  }, [tier, address]);

  useEffect(() => {
    void refreshComplianceSnapshot();
  }, [refreshComplianceSnapshot]);

  const profile = useMemo<ComplianceProfile>(() => {
    const rwaClass = rwaClassForTier(countryCode, tier);
    return { tier, rwaClass, kycAml: kycSnapshot };
  }, [countryCode, tier, kycSnapshot]);

  const jurisdictionLevel = useMemo(() => resolveJurisdictionLevel(countryCode), [countryCode]);
  const jurisdictionDescription = useMemo(() => describeJurisdictionForUi(jurisdictionLevel), [jurisdictionLevel]);

  const annualAttestationFresh = useMemo(
    () => !!address && isAnnualAttestationFresh(address, countryCode),
    [address, countryCode]
  );

  const recordAnnualAttestation = useCallback(() => {
    if (!address) return;
    recordAttestation({
      userAddress: address,
      attestationType: "annual_risk",
      version: DISCLOSURE_PACK_VERSION,
      timestamp: Date.now(),
      jurisdiction: countryCode,
      featureScope: "annual",
      body: `annual|${countryCode}|${DISCLOSURE_PACK_VERSION}`,
    });
  }, [address, countryCode]);

  const gateFor = useCallback(
    (feature: ProductFeature): FeatureGateResult => {
      if (disputeBlocksUx && feature !== "read_only") {
        return {
          allowed: false,
          mode: "blocked",
          message: "This device or position is marked under review. Borrowing and proof refresh are paused until resolved.",
          recoveryHint: "Contact support with your case reference if this state was set in error.",
        };
      }
      if (maintenanceLabel === "liquidation_eligible" && (feature === "borrow" || feature === "join_pool")) {
        return {
          allowed: false,
          mode: "blocked",
          message: "Operational policy marks this path as liquidation-eligible — new credit actions are disabled.",
          recoveryHint: "Refresh proofs, exit maintenance, or repay existing positions per dashboard guidance.",
        };
      }
      return deriveFeatureAccess({
        countryCode,
        profile,
        feature,
        walletAddress: address,
      });
    },
    [address, countryCode, profile, maintenanceLabel, disputeBlocksUx]
  );

  const acknowledgeCurrentDisclosures = useCallback(
    (ids: string[]) => {
      if (!address) return;
      acknowledgeDisclosureSet(address, ids, countryCode, DISCLOSURE_PACK_VERSION);
    },
    [address, countryCode]
  );

  const value = useMemo<ComplianceContextValue>(
    () => ({
      countryCode,
      setCountryCode,
      tier,
      setTier,
      profile,
      jurisdictionLevel,
      jurisdictionDescription,
      annualAttestationFresh,
      recordAnnualAttestation,
      refreshComplianceSnapshot,
      gateFor,
      acknowledgeCurrentDisclosures,
      maintenanceLabel,
      setMaintenanceLabel,
      disputeBlocksUx,
      setDisputeBlocksUx,
    }),
    [
      countryCode,
      tier,
      profile,
      jurisdictionLevel,
      jurisdictionDescription,
      annualAttestationFresh,
      recordAnnualAttestation,
      refreshComplianceSnapshot,
      gateFor,
      acknowledgeCurrentDisclosures,
      maintenanceLabel,
      disputeBlocksUx,
    ]
  );

  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
};

export function useCompliance(): ComplianceContextValue {
  const ctx = useContext(ComplianceContext);
  if (!ctx) throw new Error("useCompliance must be used within ComplianceProvider");
  return ctx;
}

/** Optional hook for leaf components that may render outside the provider (e.g. tests). */
export function useComplianceOptional(): ComplianceContextValue | null {
  return useContext(ComplianceContext);
}
