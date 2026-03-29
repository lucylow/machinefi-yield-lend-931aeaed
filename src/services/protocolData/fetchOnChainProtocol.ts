import { ethers } from "ethers";
import type { ProtocolDataBundle } from "./types";

/**
 * Placeholder for subgraph + multicall reads. Returns null when RPC/code unavailable.
 */
export async function fetchOnChainProtocolBundle(params: {
  provider: ethers.providers.Provider | null;
  lendingPoolAddress: string;
}): Promise<ProtocolDataBundle | null> {
  const { provider, lendingPoolAddress } = params;
  if (!provider || !lendingPoolAddress || lendingPoolAddress === ethers.constants.AddressZero) return null;
  try {
    const code = await provider.getCode(lendingPoolAddress);
    if (!code || code === "0x") return null;
  } catch {
    return null;
  }
  // Future: aggregate getPositionFull, totalAssets, utilization, etc.
  return null;
}
