import {
  FORCE_OFFLINE_MODE,
  USE_MOCK_DATA,
} from "@/constants/mockConfig";

export interface ResolveSourceInput {
  dataMode: "onchain" | "demo_fallback";
  hasLendingPoolCode: boolean;
  forceOffline: boolean;
  useMockFlag: boolean;
}

/**
 * Whether portfolio + aggregates should be driven by the simulation engine.
 */
export function shouldUseSimulationLayer(input: ResolveSourceInput): boolean {
  if (input.forceOffline) return true;
  if (input.useMockFlag) return true;
  if (input.dataMode === "demo_fallback") return true;
  if (!input.hasLendingPoolCode) return true;
  return false;
}
