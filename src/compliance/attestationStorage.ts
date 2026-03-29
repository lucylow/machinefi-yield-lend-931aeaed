import type { AttestationRecord, CountryCode } from "./types";
import { DISCLOSURE_PACK_VERSION } from "./types";

const LS_PREFIX = "mfl_attest_v1_";

function hashPayload(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(16);
}

function key(wallet: string, attestationType: string, version: string): string {
  return `${LS_PREFIX}${wallet.toLowerCase()}_${attestationType}_${version}`;
}

export function recordAttestation(record: Omit<AttestationRecord, "acknowledgmentHash"> & { body: string }): AttestationRecord {
  const acknowledgmentHash = hashPayload(record.body);
  const full: AttestationRecord = {
    ...record,
    acknowledgmentHash,
  };
  try {
    localStorage.setItem(
      key(record.userAddress, record.attestationType, record.version),
      JSON.stringify(full)
    );
  } catch {
    /* ignore quota */
  }
  return full;
}

export function getAttestation(
  userAddress: string,
  attestationType: string,
  version: string = DISCLOSURE_PACK_VERSION
): AttestationRecord | null {
  try {
    const raw = localStorage.getItem(key(userAddress, attestationType, version));
    if (!raw) return null;
    return JSON.parse(raw) as AttestationRecord;
  } catch {
    return null;
  }
}

export function isAnnualAttestationFresh(
  userAddress: string,
  jurisdiction: CountryCode,
  maxAgeMs: number = 365 * 24 * 60 * 60 * 1000
): boolean {
  const a = getAttestation(userAddress, "annual_risk", DISCLOSURE_PACK_VERSION);
  if (!a || a.jurisdiction !== jurisdiction) return false;
  return Date.now() - a.timestamp < maxAgeMs;
}

export function hasAcknowledgedDisclosureSet(
  userAddress: string,
  disclosureTypes: string[],
  version: string = DISCLOSURE_PACK_VERSION
): boolean {
  if (!userAddress) return false;
  for (const t of disclosureTypes) {
    const a = getAttestation(userAddress, `disclosure_${t}`, version);
    if (!a) return false;
  }
  return true;
}

export function acknowledgeDisclosureSet(
  userAddress: string,
  disclosureTypes: string[],
  jurisdiction: CountryCode,
  version: string = DISCLOSURE_PACK_VERSION
): void {
  const body = disclosureTypes.sort().join("|") + version + jurisdiction;
  for (const t of disclosureTypes) {
    recordAttestation({
      userAddress,
      attestationType: `disclosure_${t}`,
      version,
      timestamp: Date.now(),
      jurisdiction,
      featureScope: "disclosure",
      body: `${t}:${body}`,
    });
  }
}
