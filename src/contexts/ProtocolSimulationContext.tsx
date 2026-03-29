import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAppStore } from "@/store/appStore";
import {
  FORCE_OFFLINE_MODE,
  MOCK_DEVICE_COUNT,
  MOCK_SIM_SEED,
  MOCK_TICK_MS,
  MOCK_VOLATILITY_LEVEL,
  USE_MOCK_DATA,
} from "@/constants/mockConfig";
import { hashStringToSeed } from "@/simulation/seededRandom";
import {
  createProtocolSimulationEngine,
  getProtocolSimulationEngine,
  type ProtocolDataSource,
  type ProtocolSimulationEngine,
  type ProtocolSimulationSnapshot,
} from "@/simulation/protocolSimulationEngine";
import type { DemoScenarioId } from "@/simulation/scenarios";
import { shouldUseSimulationLayer } from "@/services/protocolData/resolveDataSource";
import { getProtocolData } from "@/services/protocolData/getProtocolData";

interface ProtocolSimulationContextValue {
  engine: ProtocolSimulationEngine | null;
  snapshot: ProtocolSimulationSnapshot;
  dataSource: ProtocolDataSource;
  isDemoSimulation: boolean;
  resetScenario: (id: DemoScenarioId) => void;
}

const ProtocolSimulationContext = createContext<ProtocolSimulationContextValue | null>(null);

function emptySnapshot(): ProtocolSimulationSnapshot {
  return {
    source: "mock",
    overview: {
      totalCollateralUsd: 0,
      totalBorrowedUsd: 0,
      activeDevices: 0,
      liquidationThresholdBps: 7500,
      poolUtilizationBps: 0,
      supplyApyBps: 0,
      borrowApyBps: 0,
      poolTotalLiquidityUsd: 0,
    },
    borrowApyLabel: "—",
    supplyApyLabel: "—",
    alerts: [],
    yieldHistory: [],
    proofs: [],
    riskEvents: [],
    primaryBorrowAsset: {
      id: "asset-demo-0",
      type: "hardware",
      owner: "0x0000…0000",
      class: "DePIN device",
      metadataUri: "",
      valueUsd: 0,
      yieldAprBps: 0,
      proofStatus: "pending",
      lastProofAt: new Date().toISOString(),
      verificationStatus: "pending",
      collateralFactorBps: 7000,
      liquidationThresholdBps: 7500,
      currentLtvBps: 0,
    },
    simulationTimeMs: Date.now(),
    mockBlockNumber: 0,
    scenarioId: "healthy",
  };
}

function getServerSnapshot(): ProtocolSimulationSnapshot {
  const e = getProtocolSimulationEngine();
  return e ? e.getSnapshot("mock") : emptySnapshot();
}

export const ProtocolSimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { provider, lendingPoolContract, address } = useWeb3();
  const dataMode = useAppStore((s) => s.dataMode);
  const demoScenario = useAppStore((s) => s.demoScenario);
  const setDemoScenario = useAppStore((s) => s.setDemoScenario);

  const simSeed = useMemo(
    () =>
      MOCK_SIM_SEED ||
      (typeof window !== "undefined" ? hashStringToSeed(`${window.location.origin}-machinefi`) : 0xfeedbeef),
    []
  );

  const engineRef = useRef<ProtocolSimulationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = createProtocolSimulationEngine({
      scenarioId: demoScenario,
      seed: simSeed,
      volatility: MOCK_VOLATILITY_LEVEL,
      targetDeviceCount: MOCK_DEVICE_COUNT,
    });
  }
  const engine = engineRef.current;

  useEffect(() => {
    engine.resetScenario(demoScenario, simSeed, MOCK_VOLATILITY_LEVEL, MOCK_DEVICE_COUNT);
  }, [demoScenario, engine, simSeed]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => engine.subscribe(onStoreChange),
    [engine]
  );

  const getSnapshot = useCallback(() => engine.getSnapshot("mock"), [engine]);

  const liveSnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [resolvedSource, setResolvedSource] = useState<ProtocolDataSource>("mock");

  const hasLendingPoolCode = !!lendingPoolContract;

  const isDemoSimulation = shouldUseSimulationLayer({
    dataMode,
    hasLendingPoolCode,
    forceOffline: FORCE_OFFLINE_MODE,
    useMockFlag: USE_MOCK_DATA,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const bundle = await getProtocolData(
        {
          walletAddress: address,
          dataMode,
          hasLendingPoolCode,
          simulationSnapshot: engine.getSnapshot("mock"),
        },
        provider
      );
      if (!cancelled) setResolvedSource(bundle.source);
    };
    void run();
    const id = window.setInterval(run, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address, dataMode, engine, hasLendingPoolCode, provider]);

  const snapshot = useMemo(() => {
    const s = { ...liveSnapshot };
    s.source = isDemoSimulation ? "mock" : resolvedSource;
    return s;
  }, [liveSnapshot, isDemoSimulation, resolvedSource]);

  const resetScenario = useCallback(
    (id: DemoScenarioId) => {
      setDemoScenario(id);
    },
    [setDemoScenario]
  );

  const value = useMemo<ProtocolSimulationContextValue>(
    () => ({
      engine,
      snapshot,
      dataSource: snapshot.source,
      isDemoSimulation,
      resetScenario,
    }),
    [engine, snapshot, isDemoSimulation, resetScenario]
  );

  useEffect(() => {
    const id = window.setInterval(() => engine.tick(), MOCK_TICK_MS);
    return () => clearInterval(id);
  }, [engine]);

  return (
    <ProtocolSimulationContext.Provider value={value}>{children}</ProtocolSimulationContext.Provider>
  );
};

export function useProtocolSimulation() {
  const ctx = useContext(ProtocolSimulationContext);
  if (!ctx) throw new Error("useProtocolSimulation must be used within ProtocolSimulationProvider");
  return ctx;
}

export function useProtocolSimulationOptional(): ProtocolSimulationContextValue | null {
  return useContext(ProtocolSimulationContext);
}
