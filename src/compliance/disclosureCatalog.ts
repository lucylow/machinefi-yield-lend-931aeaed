import type { RiskDisclosure } from "./types";
import { DISCLOSURE_PACK_VERSION } from "./types";

const V = DISCLOSURE_PACK_VERSION;

export const DISCLOSURE_CATALOG: Record<string, RiskDisclosure> = {
  non_custodial_posture: {
    type: "non_custodial_posture",
    version: V,
    title: "Non-custodial protocol posture",
    bullets: [
      "The protocol does not take custody of your private keys or bank accounts.",
      "Stablecoin proceeds from borrowing are sent directly to your wallet; physical hardware remains your responsibility.",
      "Smart contracts may escrow NFT collateral while a loan is open — that is lien/pledge mechanics, not a regulated custodial service.",
    ],
  },
  borrow_risks: {
    type: "borrow_risks",
    version: V,
    title: "Borrowing and liquidation risks",
    bullets: [
      "You can lose the full position if collateral value falls or proofs go stale.",
      "Yield assumptions can change; oracles and device performance affect LTV.",
      "Liquidation may transfer the hardware NFT to a liquidator per contract rules after any grace period.",
    ],
  },
  device_operation: {
    type: "device_operation",
    version: V,
    title: "Device operation and proofs",
    bullets: [
      "You are expected to keep devices online and refresh proofs on the cadence the protocol describes.",
      "Planned maintenance can be declared in-product; repeated misses can reduce borrow power or trigger liquidation eligibility.",
    ],
  },
  proof_obligations: {
    type: "proof_obligations",
    version: V,
    title: "Proof cadence",
    bullets: [
      "Stale proofs can block new borrows and weaken collateral marks.",
      "The app may warn you before proofs expire — warnings are operational aids, not guarantees.",
    ],
  },
  jurisdiction_general: {
    type: "jurisdiction_general",
    version: V,
    title: "Jurisdiction and tax",
    bullets: [
      "Laws vary by country; some features may be unavailable or unsuitable where you live.",
      "You are responsible for taxes, reporting, and licensing that may apply to you.",
      "Nothing in the app is legal, tax, or investment advice.",
    ],
  },
  institutional_only: {
    type: "institutional_only",
    version: V,
    title: "Institutional features",
    bullets: [
      "Institutional pools may require KYC, AML, accreditation, and source-of-funds documentation via future adapters.",
      "Retail paths stay permissionless; institutional modules are opt-in and segregated.",
    ],
  },
};

export function listDisclosures(ids: string[]): RiskDisclosure[] {
  return ids.map((id) => DISCLOSURE_CATALOG[id]).filter(Boolean);
}
