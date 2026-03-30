import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useLendingPool, type LoanPosition } from "@/hooks/useLendingPool";
import { PageHeader } from "@/components/Layout/PageHeader";
import { AppPage } from "@/components/Layout/AppPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthBar } from "@/components/defi/HealthBar";
import { healthFactorFromUsd, parseUsd } from "@/lib/healthFactor";
import { LIQUIDATION_THRESHOLD_BPS, MAX_INITIAL_LTV_BPS, BASE_INTEREST_RATE_BPS } from "@/constants/addresses";
import { formatAprFromBps, formatBpsAsPercent } from "@/lib/format";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { DataTable } from "@/components/defi/DataTable";
import { borrowFlowPath } from "@/lib/borrowRoutes";

const PositionDetail = () => {
  const { nftId } = useParams();
  const id = Number(nftId);
  const { isConnected } = useWeb3();
  const { snapshot } = useProtocolSimulation();
  const { getUserPositions, repay } = useLendingPool();
  const [loan, setLoan] = useState<LoanPosition | null>(null);

  useEffect(() => {
    if (!isConnected || !Number.isFinite(id)) {
      setLoan(null);
      return;
    }
    let cancelled = false;
    getUserPositions().then((rows) => {
      if (cancelled) return;
      setLoan(rows.find((p) => p.nftId === id) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [isConnected, id, getUserPositions]);

  if (!isConnected) {
    return (
      <AppPage>
        <PageHeader eyebrow="Position" title="Details" description="Connect to inspect this loan account." />
        <Button asChild variant="outline" className="rounded-lg">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </AppPage>
    );
  }

  if (!loan) {
    return (
      <AppPage>
        <PageHeader eyebrow="Position" title="Not found" description="No position for this id in the current demo set." />
        <Button asChild variant="outline" className="rounded-lg">
          <Link to="/positions">All positions</Link>
        </Button>
      </AppPage>
    );
  }

  const c = parseUsd(loan.collateralValue);
  const d = parseUsd(loan.debt);
  const hf = healthFactorFromUsd(c, d);
  const interestUsd = loan.accruedInterestUsd;

  return (
    <AppPage>
      <PageHeader
        eyebrow={`NFT #${loan.nftId}`}
        title={loan.deviceType}
        description="Yield history and oracle context are illustrative until your subgraph is wired; debt and collateral reflect the active demo position."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-lg border-border">
              <Link to={borrowFlowPath(loan.nftId, loan.deviceType)}>Borrow more</Link>
            </Button>
            <Button type="button" size="sm" className="rounded-lg btn-gradient text-primary-foreground border-0" onClick={() => repay(loan.nftId)}>
              Repay full
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-display">Risk & health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <HealthBar healthFactor={hf} />
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Liquidation threshold</p>
                <p className="font-semibold tabular-nums">{formatBpsAsPercent(LIQUIDATION_THRESHOLD_BPS)} LTV</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Max initial LTV</p>
                <p className="font-semibold tabular-nums">{formatBpsAsPercent(MAX_INITIAL_LTV_BPS)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Borrow APR</p>
                <p className="font-semibold tabular-nums">{formatAprFromBps(BASE_INTEREST_RATE_BPS)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Proof freshness</p>
                <p className="font-semibold">Last refresh ~45m ago (demo)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-display">Debt breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Principal</span>
              <span className="font-mono tabular-nums">${(d - interestUsd).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accrued interest (est.)</span>
              <span className="font-mono tabular-nums">${interestUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border/50 pt-3 font-medium">
              <span>Total due</span>
              <span className="font-mono tabular-nums">${d.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/60 mt-6">
        <CardHeader>
          <CardTitle className="text-base font-display">Yield history (protocol demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rowKey={(r) => r.at}
            rows={snapshot.yieldHistory}
            columns={[
              { key: "at", header: "Period", cell: (r) => <span className="font-mono text-xs">{r.at}</span> },
              { key: "y", header: "Yield", cell: (r) => `$${(r.yieldUsd / 1000).toFixed(1)}k` },
              { key: "apr", header: "APR", cell: (r) => formatAprFromBps(r.aprBps) },
            ]}
          />
        </CardContent>
      </Card>
    </AppPage>
  );
};

export default PositionDetail;
