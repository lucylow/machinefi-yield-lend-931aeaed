import { cn } from "@/lib/utils";
import type { LiquidationStatus } from "@/types/protocol";

export function LiquidationStatusBadge({ status }: { status: LiquidationStatus }) {
  const config: Record<LiquidationStatus, { label: string; className: string }> = {
    none: { label: "Not eligible", className: "border-border text-muted-foreground bg-muted/30" },
    eligible: { label: "Eligible", className: "border-destructive/50 text-destructive bg-destructive/10" },
    queued: { label: "Queued", className: "border-amber-500/50 text-amber-400 bg-amber-500/10" },
    completed: { label: "Completed", className: "border-muted-foreground/40 text-muted-foreground" },
  };
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        c.className
      )}
    >
      {c.label}
    </span>
  );
}
