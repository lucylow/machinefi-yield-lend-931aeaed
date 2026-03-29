import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { FORCE_OFFLINE_MODE, USE_MOCK_DATA } from "@/constants/mockConfig";
import { getProtocolSimulationEngine } from "@/simulation/protocolSimulationEngine";
import { readProtocolCache, writeProtocolCache } from "./cache";
import { fetchOnChainProtocolBundle } from "./fetchOnChainProtocol";
import type { GetProtocolDataContext, ProtocolDataBundle } from "./types";
import { shouldUseSimulationLayer } from "./resolveDataSource";

/**
 * Unified entry: on-chain (when deployed) → session cache → live simulation snapshot.
 */
export async function getProtocolData(
  ctx: GetProtocolDataContext,
  provider: ethers.providers.Provider | null
): Promise<ProtocolDataBundle> {
  const engine = getProtocolSimulationEngine();
  const sim = ctx.simulationSnapshot;
  if (!engine) {
    return { ...sim, source: "mock" };
  }

  const hasCode =
    ctx.hasLendingPoolCode ||
    (await checkDeployed(provider, CONTRACT_ADDRESSES.lendingPool));

  const useSim = shouldUseSimulationLayer({
    dataMode: ctx.dataMode,
    hasLendingPoolCode: hasCode,
    forceOffline: FORCE_OFFLINE_MODE,
    useMockFlag: USE_MOCK_DATA,
  });

  if (useSim) {
    const snap = engine.getSnapshot("mock");
    return snap;
  }

  const cached = readProtocolCache();
  try {
    const onChain = await fetchOnChainProtocolBundle({
      provider,
      lendingPoolAddress: CONTRACT_ADDRESSES.lendingPool,
    });
    if (onChain) {
      writeProtocolCache(onChain);
      return { ...onChain, source: "real" };
    }
  } catch {
    /* fall through */
  }

  if (cached) {
    return { ...cached, source: "cached" };
  }

  return engine.getSnapshot("mock");
}

async function checkDeployed(
  provider: ethers.providers.Provider | null,
  address: string
): Promise<boolean> {
  if (!provider || !address || address === ethers.constants.AddressZero) return false;
  try {
    const code = await provider.getCode(address);
    return !!(code && code !== "0x");
  } catch {
    return false;
  }
}
