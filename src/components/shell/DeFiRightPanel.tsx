import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useLendingPool } from "@/hooks/useLendingPool";
import { HealthBar } from "@/components/defi/HealthBar";
import { healthFactorFromUsd, parseUsd } from "@/lib/healthFactor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/appStore";
import { Skeleton } from "@/components/ui/skeleton";
import { OracleFreshnessBadge, ProofFreshnessBadge } from "@/components/protocol/FreshnessBadge";

export function DeFiRightPanel() {
  const { isConnected } = useWeb3();
  const { getUserPositions } = useLendingPool();
  const { dataMode } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [aggCollateral, setAggCollateral] = useState(0);
  const [aggDebt, setAggDebt] = useState(0);

  useEffect(() => {
    if (!isConnected) {
      setLoading(false);
      setAggCollateral(0);
      setAggDebt(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUserPositions()
      .then((rows) => {
        if (cancelled) return;
        let c = 0;
        let d = 0;
        for (const p of rows) {
          c += parseUsd(p.collateralValue);
          d += parseUsd(p.debt);
        }
        setAggCollateral(c);
        setAggDebt(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, getUserPositions]);

  const hf = healthFactorFromUsd(aggCollateral, aggDebt);

  return (
    <aside className="hidden xl:flex w-[300px] shrink-0 flex-col border-l border-border/80 bg-[hsl(200_45%_5%/0.9)] backdrop-blur-md">
      <div className="p-4 border-b border-border/60">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Position summary</p>
        {!isConnected && <p className="mt-3 text-sm text-muted-foreground">Connect a wallet to see live exposure.</p>}
        {isConnected && loading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-10 w-full bg-muted" />
            <Skeleton className="h-16 w-full bg-muted" />
          </div>
        )}
        {isConnected && !loading && (
          <div className="mt-4 space-y-4">
            <HealthBar healthFactor={hf} />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/50 bg-card/40 px-2 py-2">
                <p className="text-muted-foreground uppercase text-[10px]">Collateral</p>
                <p className="font-mono font-semibold tabular-nums">${aggCollateral.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-card/40 px-2 py-2">
                <p className="text-muted-foreground uppercase text-[10px]">Debt</p>
                <p className="font-mono font-semibold tabular-nums">${aggDebt.toFixed(2)}</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full rounded-lg border-primary/35">
              <Link to="/positions">Manage positions</Link>
            </Button>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Oracle & proofs</p>
        <div className="space-y-2">
          <OracleFreshnessBadge state="live" />
          <ProofFreshnessBadge minutesAgo={45} />
        </div>
        <Separator className="bg-border/60" />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Data source</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Mode:{" "}
          <span className="text-foreground font-medium">{dataMode === "demo_fallback" ? "Demo + RPC fallback" : "On-chain primary"}</span>
          . Subgraph / indexer hooks can replace mock aggregations without changing this panel.
        </p>
      </div>
    </aside>
  );
}
