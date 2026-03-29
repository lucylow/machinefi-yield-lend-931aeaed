import type { ProtocolDataBundle } from "./types";

const KEY = "machinefi-protocol-cache-v1";

export function readProtocolCache(): ProtocolDataBundle | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProtocolDataBundle;
  } catch {
    return null;
  }
}

export function writeProtocolCache(data: ProtocolDataBundle) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}
