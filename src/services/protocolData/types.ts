import type { ProtocolSimulationSnapshot, ProtocolDataSource } from "@/simulation/protocolSimulationEngine";

export type { ProtocolDataSource };

/** Unified protocol payload for hooks and marketing surfaces. */
export type ProtocolDataBundle = ProtocolSimulationSnapshot;

export interface GetProtocolDataContext {
  walletAddress: string | null;
  dataMode: "onchain" | "demo_fallback";
  hasLendingPoolCode: boolean;
  /** Current snapshot from simulation (required for merge). */
  simulationSnapshot: ProtocolSimulationSnapshot;
}
