/**
 * Demo / simulation configuration (Vite env). Defaults favor a working demo.
 */
export type MockVolatilityLevel = "low" | "medium" | "high";

function envBool(key: string, defaultValue: boolean): boolean {
  const v = (import.meta.env[key] as string | undefined)?.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return defaultValue;
}

function envInt(key: string, defaultValue: number): number {
  const v = (import.meta.env[key] as string | undefined)?.trim();
  if (!v) return defaultValue;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

function envVolatility(key: string, defaultValue: MockVolatilityLevel): MockVolatilityLevel {
  const v = (import.meta.env[key] as string | undefined)?.trim().toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return defaultValue;
}

/** When true, prefer the in-memory simulation even if a wallet contract is attached. */
export const USE_MOCK_DATA = envBool("VITE_USE_MOCK_DATA", true);

/** Skip RPC / on-chain reads; use cache then simulation. */
export const FORCE_OFFLINE_MODE = envBool("VITE_FORCE_OFFLINE_MODE", false);

export const MOCK_VOLATILITY_LEVEL: MockVolatilityLevel = envVolatility("VITE_MOCK_VOLATILITY_LEVEL", "medium");

/** Target device count for generated demo devices (clamped in engine). */
export const MOCK_DEVICE_COUNT = Math.min(24, Math.max(1, envInt("VITE_MOCK_DEVICE_COUNT", 3)));

/** Deterministic seed for noise (0 = derive from session). */
export const MOCK_SIM_SEED = envInt("VITE_MOCK_SEED", 0);

/** Simulation tick interval (ms). */
export const MOCK_TICK_MS = Math.max(250, envInt("VITE_MOCK_TICK_MS", 1000));

/** Mock tx delay bounds (ms). */
export const MOCK_TX_MIN_MS = envInt("VITE_MOCK_TX_MIN_MS", 1000);
export const MOCK_TX_MAX_MS = Math.max(MOCK_TX_MIN_MS, envInt("VITE_MOCK_TX_MAX_MS", 2800));

/** Low probability a mock tx fails (for resilience demos). */
export const MOCK_TX_FAIL_PROBABILITY = Math.min(
  0.15,
  Math.max(0, Number.parseFloat((import.meta.env.VITE_MOCK_TX_FAIL_PROBABILITY as string | undefined) ?? "0") || 0)
);
