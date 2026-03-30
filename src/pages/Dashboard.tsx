import { useWeb3 } from "@/contexts/Web3Context";
import { useHardwareNFT, type HardwareDevice } from "@/hooks/useHardwareNFT";
import { useLendingPool, type LoanPosition } from "@/hooks/useLendingPool";
import { useProtocolOverview } from "@/hooks/useProtocolOverview";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getLoadErrorMessage } from "@/lib/errors";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/Layout/PageHeader";
import { AppPage } from "@/components/Layout/AppPage";
import { EmptyStateCard } from "@/components/protocol/EmptyStateCard";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/defi/StatCard";
import { HealthBar } from "@/components/defi/HealthBar";
import { WarningBanner } from "@/components/defi/WarningBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { healthFactorFromUsd, parseUsd } from "@/lib/healthFactor";
import { formatUsd, formatBpsAsPercent, formatAprFromBps } from "@/lib/format";
import { BASE_INTEREST_RATE_BPS } from "@/constants/addresses";
import { DataTable } from "@/components/defi/DataTable";
import { useAppStore } from "@/store/appStore";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { isConnected, connectWallet } = useWeb3();
  const { getUserDevices } = useHardwareNFT();
  const { getUserPositions } = useLendingPool();
  const { data: market, isLoading: marketLoading } = useProtocolOverview();
  const dataMode = useAppStore((s) => s.dataMode);

  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [loans, setLoans] = useState<LoanPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      setDevices([]);
      setLoans([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getUserDevices(), getUserPositions()])
      .then(([d, l]) => {
        if (!cancelled) {
          setDevices(d);
          setLoans(l);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDevices([]);
          setLoans([]);
          toast.error(getLoadErrorMessage(err, "Could not load dashboard data."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, getUserDevices, getUserPositions]);

  const { aggCollateral, aggDebt, hf } = useMemo(() => {
    let c = 0;
    let d = 0;
    for (const p of loans) {
      c += parseUsd(p.collateralValue);
      d += parseUsd(p.debt);
    }
    return { aggCollateral: c, aggDebt: d, hf: healthFactorFromUsd(c, d) };
  }, [loans]);

  const activeDevices = devices.filter((x) => x.isActive).length;
  const staleDevices = devices.filter((x) => x.simStatus === "stale" || x.simStatus === "inactive").length;

  const nearLiquidation = loans.some((l) => healthFactorFromUsd(parseUsd(l.collateralValue), parseUsd(l.debt)) < 1.08);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Control center"
        title="Dashboard"
        description="Portfolio, devices, and pool conditions for machine-backed credit. Oracle marks and proof freshness directly affect collateral value and health."
        actions={
          isConnected ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-lg border-border">
                <Link to="/devices">Devices</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg border-border">
                <Link to="/lend">Lend</Link>
              </Button>
              <Button asChild size="sm" className="btn-gradient rounded-lg text-primary-foreground border-0">
                <Link to="/borrow">Borrow</Link>
              </Button>
            </div>
          ) : null
        }
      />

      {dataMode === "demo_fallback" && (
        <WarningBanner severity="info" title="Fallback data mode">
          Aggregates mix RPC-ready hooks with demo constants. Enable on-chain primary in settings when your indexer is live.
        </WarningBanner>
      )}

      {!isConnected ? (
        <EmptyStateCard
          title="Connect wallet"
          description="The dApp reads positions and devices from your connected account. Transactions are always explicit in the borrow, repay, and lend flows."
          action={
            <Button type="button" onClick={connectWallet} className="btn-gradient rounded-lg text-primary-foreground border-0">
              Connect wallet
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {nearLiquidation && (
            <WarningBanner severity="critical" title="Liquidation risk">
              At least one position is close to HF 1.0. Repay, add collateral (when supported), or refresh proofs before marks move against you.
            </WarningBanner>
          )}

          <section aria-labelledby="portfolio-heading">
            <h2 id="portfolio-heading" className="sr-only">
              Portfolio overview
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total collateral" value={`$${aggCollateral.toFixed(2)}`} sub="Marked on your devices" />
              <StatCard label="Total borrowed" value={`$${aggDebt.toFixed(2)}`} sub="Principal + interest in pool" />
              <StatCard
                label="Net position"
                value={`$${(aggCollateral - aggDebt).toFixed(2)}`}
                sub="Collateral minus debt (demo marks)"
              />
              <StatCard
                label="Borrow APR (indic.)"
                value={market ? formatAprFromBps(market.borrowApyBps) : formatAprFromBps(BASE_INTEREST_RATE_BPS)}
              />
            </div>
            <Card className="mt-4 border-border/70 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base font-display">Health factor</CardTitle>
              </CardHeader>
              <CardContent>
                <HealthBar healthFactor={hf} />
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="devices-heading" className="grid gap-4 lg:grid-cols-2">
            <div>
              <h2 id="devices-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Device summary
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Registered" value={loading ? "…" : devices.length} />
                <StatCard label="Active" value={loading ? "…" : activeDevices} />
                <StatCard label="Stale proofs" value={loading ? "…" : staleDevices} sub="&gt;6h (demo rule)" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Loan summary</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Open loans" value={loading ? "…" : loans.filter((l) => l.status === "active").length} />
                <StatCard
                  label="Borrow APR"
                  value={market ? formatAprFromBps(market.borrowApyBps) : formatAprFromBps(BASE_INTEREST_RATE_BPS)}
                />
                <StatCard
                  label="Risk status"
                  value={nearLiquidation ? "Elevated" : "Normal"}
                  sub="Based on HF buffer"
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="alerts-heading">
            <h2 id="alerts-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Alerts
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {staleDevices > 0 && (
                <WarningBanner severity="warning" title="Proof is stale">
                  {staleDevices} device(s) have not refreshed proofs recently; collateral marks may be haircut until updated.
                </WarningBanner>
              )}
              <WarningBanner severity="info" title="Oracle status">
                Feeds are within SLA on BNB Chain testnet. Degraded oracles will surface here with explicit user messaging.
              </WarningBanner>
            </div>
          </section>

          <section aria-labelledby="market-heading">
            <h2 id="market-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Market overview
            </h2>
            {marketLoading || !market ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((k) => (
                  <Skeleton key={k} className="h-24 rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Pool liquidity (demo)"
                  value={formatUsd(market.poolTotalLiquidityUsd, { compact: true })}
                />
                <StatCard label="Utilization" value={formatBpsAsPercent(market.poolUtilizationBps, 1)} />
                <StatCard label="Borrow APY" value={market.borrowApyLabel} sub="Pool variable" />
              </div>
            )}
          </section>

          <section aria-labelledby="positions-table-heading">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
              <h2 id="positions-table-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Open positions
              </h2>
              <Button asChild variant="link" className="text-primary h-auto p-0 text-xs">
                <Link to="/positions">View all</Link>
              </Button>
            </div>
            <DataTable
              rows={loans.filter((l) => l.status === "active")}
              rowKey={(r) => String(r.nftId)}
              empty="No active loans. Open a borrow against a verified device."
              columns={[
                { key: "d", header: "Device", cell: (r) => r.deviceType },
                { key: "c", header: "Collateral", cell: (r) => `$${r.collateralValue}` },
                { key: "b", header: "Debt", cell: (r) => `$${r.debt}` },
                {
                  key: "h",
                  header: "HF",
                  cell: (r) => (Number.isFinite(r.healthFactor) ? r.healthFactor.toFixed(2) : "∞"),
                },
                {
                  key: "a",
                  header: "",
                  cell: (r) => (
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-primary">
                      <Link to={`/positions/${r.nftId}`}>Details</Link>
                    </Button>
                  ),
                },
              ]}
            />
          </section>
        </div>
      )}
    </AppPage>
  );
};

export default Dashboard;
