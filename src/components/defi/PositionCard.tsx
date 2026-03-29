import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthBar } from "@/components/defi/HealthBar";
import { healthBandFromFactor, healthFactorFromUsd, parseUsd } from "@/lib/healthFactor";
import { cn } from "@/lib/utils";
import type { LoanPosition } from "@/hooks/useLendingPool";
import { BASE_INTEREST_RATE_BPS } from "@/constants/addresses";
import { formatAprFromBps } from "@/lib/format";
import { borrowFlowPath } from "@/lib/borrowRoutes";

export interface PositionCardProps {
  loan: LoanPosition;
  onRepay?: (nftId: number) => void;
  className?: string;
}

function statusLabel(hf: number): { text: string; className: string } {
  const b = healthBandFromFactor(hf);
  if (b === "danger") return { text: "Liquidatable", className: "text-rose-400" };
  if (b === "caution") return { text: "At risk", className: "text-amber-400" };
  return { text: "Healthy", className: "text-emerald-400" };
}

export function PositionCard({ loan, onRepay, className }: PositionCardProps) {
  const c = parseUsd(loan.collateralValue);
  const d = parseUsd(loan.debt);
  const hf = healthFactorFromUsd(c, d);
  const st = statusLabel(hf);

  return (
    <Card
      className={cn(
        "border-border/70 bg-card/70 backdrop-blur-sm",
        healthBandFromFactor(hf) === "danger" && "ring-1 ring-rose-500/40",
        healthBandFromFactor(hf) === "caution" && "ring-1 ring-amber-500/35",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2 space-y-0">
        <div>
          <CardTitle className="text-base font-display">{loan.deviceType}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1 font-mono">Position #{loan.nftId}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground">Status</p>
          <p className={cn("text-sm font-semibold", st.className)}>{st.text}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <HealthBar healthFactor={hf} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Collateral</p>
            <p className="font-semibold tabular-nums">${loan.collateralValue}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Debt</p>
            <p className="font-semibold tabular-nums">${loan.debt}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">LTV</p>
            <p className="font-semibold tabular-nums">{loan.ltv}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Borrow APR</p>
            <p className="font-semibold tabular-nums">{formatAprFromBps(BASE_INTEREST_RATE_BPS)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-lg border-border">
            <Link to={borrowFlowPath(loan.nftId, loan.deviceType)}>Borrow more</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-lg"
            onClick={() => onRepay?.(loan.nftId)}
          >
            Repay
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-lg text-muted-foreground">
            <Link to={`/positions/${loan.nftId}`}>Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
