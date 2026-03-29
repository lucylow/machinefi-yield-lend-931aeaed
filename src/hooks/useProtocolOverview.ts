import { useQuery } from "@tanstack/react-query";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import type { RiskEvent } from "@/types/protocol";
import type { ProtocolDataSource } from "@/simulation/protocolSimulationEngine";

export interface ProtocolOverviewData {
  totalCollateralUsd: number;
  totalBorrowedUsd: number;
  activeDevices: number;
  liquidationThresholdBps: number;
  poolUtilizationBps: number;
  supplyApyBps: number;
  borrowApyBps: number;
  poolTotalLiquidityUsd: number;
  borrowApyLabel: string;
  supplyApyLabel: string;
  alerts: RiskEvent[];
  dataSource: ProtocolDataSource;
}

export function useProtocolOverview() {
  const { snapshot, dataSource } = useProtocolSimulation();
  return useQuery({
    queryKey: ["protocol-overview", snapshot.mockBlockNumber, snapshot.scenarioId, dataSource],
    queryFn: async (): Promise<ProtocolOverviewData> => {
      await new Promise((r) => setTimeout(r, 50));
      return {
        ...snapshot.overview,
        borrowApyLabel: snapshot.borrowApyLabel,
        supplyApyLabel: snapshot.supplyApyLabel,
        alerts: snapshot.alerts,
        dataSource,
      };
    },
    staleTime: 0,
  });
}
