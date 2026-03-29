import { formatDistanceToNow } from "date-fns";

export function formatUsd(n: number, opts?: { compact?: boolean }) {
  if (opts?.compact && n >= 1_000_000)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 100 ? 2 : 0,
  }).format(n);
}

export function formatBpsAsPercent(bps: number, fractionDigits = 2) {
  return `${(bps / 100).toFixed(fractionDigits)}%`;
}

export function formatAprFromBps(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatRelativeIso(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function shortenHash(s: string, left = 6, right = 4) {
  if (s.length <= left + right + 1) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}
