import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { healthBandFromFactor, type HealthBand } from "@/lib/healthFactor";
import { LIQUIDATION_THRESHOLD_BPS } from "@/constants/addresses";
import { formatBpsAsPercent } from "@/lib/format";

export interface HealthBarProps {
  /** Health factor; Infinity treated as max safe. */
  healthFactor: number;
  className?: string;
  showNumeric?: boolean;
  liquidationThresholdBps?: number;
}

function bandColor(band: HealthBand): string {
  switch (band) {
    case "safe":
      return "bg-emerald-500";
    case "caution":
      return "bg-amber-400";
    case "danger":
      return "bg-rose-500";
  }
}

/** Map HF to 0–100 for bar (1.0 = 100% of bar toward liquidation). */
function hfToPct(hf: number): number {
  if (!Number.isFinite(hf)) return 8;
  const clamped = Math.min(Math.max(hf, 0.85), 2);
  return ((2 - clamped) / (2 - 0.85)) * 100;
}

export function HealthBar({
  healthFactor,
  className,
  showNumeric = true,
  liquidationThresholdBps = LIQUIDATION_THRESHOLD_BPS,
}: HealthBarProps) {
  const band = healthBandFromFactor(healthFactor);
  const pct = hfToPct(healthFactor);
  const displayHf = Number.isFinite(healthFactor) ? healthFactor.toFixed(2) : "∞";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Health factor</span>
        {showNumeric && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "font-mono text-sm font-semibold tabular-nums cursor-help",
                  band === "safe" && "text-emerald-400",
                  band === "caution" && "text-amber-400",
                  band === "danger" && "text-rose-400"
                )}
              >
                {displayHf}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
              <p className="font-medium text-foreground mb-1">Liquidation boundary</p>
              <p>
                When health factor falls below 1.0, your position is liquidatable at the protocol threshold (
                {formatBpsAsPercent(liquidationThresholdBps, 2)} max loan-to-value). Keep a buffer above 1.0 —
                especially if proofs or oracle marks move against you.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", bandColor(band))}
          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-background/90"
          style={{ left: "calc(100% - 13.04%)" }}
          title="HF ≈ 1.0"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Vertical mark: HF 1.0 · {band === "danger" ? "Reduce debt or add collateral." : "Monitor proofs & marks."}
      </p>
    </div>
  );
}
