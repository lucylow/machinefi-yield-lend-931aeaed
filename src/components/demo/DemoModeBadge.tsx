import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { FlaskConical } from "lucide-react";

export function DemoModeBadge({ className }: { className?: string }) {
  const { isDemoSimulation, dataSource, snapshot } = useProtocolSimulation();
  if (!isDemoSimulation && dataSource === "real") return null;

  const label =
    dataSource === "cached"
      ? "Cached data"
      : dataSource === "real"
        ? "Live"
        : "Demo mode";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-200 text-[10px] uppercase tracking-wide font-semibold",
            dataSource === "cached" && "border-sky-500/40 bg-sky-500/10 text-sky-100",
            dataSource === "real" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
            className
          )}
        >
          <FlaskConical className="h-3 w-3" aria-hidden />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed border-border bg-card">
        {isDemoSimulation ? (
          <>
            Interactive simulation ({snapshot.scenarioId.replace("_", " ")}). Yield, collateral marks, and interest accrue in
            real time — not mainnet funds.
          </>
        ) : (
          <>Data source: {dataSource}. On-chain reads are primary when your pool is deployed.</>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
