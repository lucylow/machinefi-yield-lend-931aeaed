import {
  MOCK_TX_FAIL_PROBABILITY,
  MOCK_TX_MAX_MS,
  MOCK_TX_MIN_MS,
} from "@/constants/mockConfig";
import { mulberry32 } from "@/simulation/seededRandom";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export interface MockTxResult {
  ok: boolean;
  hash: string;
  blockNumber: number;
}

/**
 * Simulates wallet confirmation delay and returns a pseudo tx hash + block.
 */
export async function runMockTransaction(seed: number, blockHint: number): Promise<MockTxResult> {
  const rng = mulberry32(seed ^ 0xdeadbeef);
  const span = MOCK_TX_MAX_MS - MOCK_TX_MIN_MS;
  const ms = MOCK_TX_MIN_MS + Math.floor(rng() * Math.max(1, span));
  await sleep(ms);
  if (rng() < MOCK_TX_FAIL_PROBABILITY) {
    return { ok: false, hash: "", blockNumber: blockHint };
  }
  const h = Array.from({ length: 64 }, () => Math.floor(rng() * 16).toString(16)).join("");
  return {
    ok: true,
    hash: `0x${h}`,
    blockNumber: blockHint + Math.floor(rng() * 4) + 1,
  };
}
