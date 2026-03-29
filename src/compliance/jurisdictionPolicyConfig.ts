import type { CountryCode, JurisdictionLevel } from "./types";

/**
 * Central jurisdiction risk map — tune via governance/config, not scattered in components.
 * Values are product policy tiers only (no on-chain geodata).
 */
export const JURISDICTION_DEFAULT_LEVEL: JurisdictionLevel = "unknown";

export const COUNTRY_JURISDICTION_LEVEL: Record<CountryCode, JurisdictionLevel> = {
  // Examples — deployers should replace with counsel-approved policy JSON.
  US: "warning",
  GB: "warning",
  DE: "allowed",
  FR: "allowed",
  SG: "allowed",
  JP: "warning",
  CN: "restricted",
  RU: "blocked",
  IR: "blocked",
  KP: "blocked",
  SY: "blocked",
  CU: "blocked",
  MM: "blocked",
  UA: "warning",
  BR: "allowed",
  IN: "warning",
  NG: "warning",
  ZA: "allowed",
  AE: "warning",
  TR: "warning",
  KR: "allowed",
  CA: "warning",
  AU: "allowed",
  AR: "warning",
  MX: "allowed",
  UNKNOWN: "unknown",
};

export function resolveJurisdictionLevel(code: CountryCode | undefined | null): JurisdictionLevel {
  if (!code || code === "" || code === "__UNKNOWN__") return "unknown";
  const upper = code.trim().toUpperCase();
  return COUNTRY_JURISDICTION_LEVEL[upper] ?? JURISDICTION_DEFAULT_LEVEL;
}
