import { cn } from "@/lib/utils";

type Freshness = "live" | "stale" | "unknown";

export function OracleFreshnessBadge({ state }: { state: Freshness }) {
  const map: Record<Freshness, { label: string; className: string; aria: string }> = {
    live: {
      label: "Oracle live",
      className: "border-primary/40 bg-primary/10 text-primary",
      aria: "Oracle data is fresh",
    },
    stale: {
      label: "Oracle stale",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
      aria: "Oracle data may be stale",
    },
    unknown: {
      label: "Oracle unknown",
      className: "border-border bg-muted/50 text-muted-foreground",
      aria: "Oracle status unknown",
    },
  };
  const m = map[state];
  return (
    <span
      role="status"
      aria-label={m.aria}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        m.className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state === "live" && "bg-primary animate-pulse motion-reduce:animate-none",
          state === "stale" && "bg-amber-400",
          state === "unknown" && "bg-muted-foreground"
        )}
        aria-hidden
      />
      {m.label}
    </span>
  );
}

export function ProofFreshnessBadge({ minutesAgo }: { minutesAgo: number | null }) {
  if (minutesAgo == null) {
    return (
      <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        No proof
      </span>
    );
  }
  const stale = minutesAgo > 24 * 60;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        stale
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-primary/40 bg-primary/10 text-primary"
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", stale ? "bg-amber-400" : "bg-primary animate-pulse motion-reduce:animate-none")}
        aria-hidden
      />
      Proof {minutesAgo < 120 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`}
    </span>
  );
}
