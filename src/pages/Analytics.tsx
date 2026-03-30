import { Link } from "react-router-dom";
import { PageHeader } from "@/components/Layout/PageHeader";
import { AppPage } from "@/components/Layout/AppPage";
import { useProtocolOverview } from "@/hooks/useProtocolOverview";
import { StatCard } from "@/components/defi/StatCard";
import { WarningBanner } from "@/components/defi/WarningBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd, formatRelativeIso, formatBpsAsPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/appStore";

const AnalyticsPage = () => {
  const { data, isLoading, isError, dataUpdatedAt } = useProtocolOverview();
  const dataMode = useAppStore((s) => s.dataMode);

  return (
    <AppPage>
      <PageHeader
        eyebrow="System"
        title="Analytics"
        description="Protocol-level utilization, borrow costs, and risk signals. Wire your subgraph here to replace demo aggregates."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg border-border">
            <Link to="/protocol/revenue">Protocol revenue</Link>
          </Button>
        }
      />

      {dataMode === "demo_fallback" && (
        <WarningBanner severity="info" title="Demo data mode">
          Showing mock aggregates with TanStack Query caching. Toggle “on-chain primary” in settings when your indexer is live.
        </WarningBanner>
      )}

      {isError && (
        <WarningBanner severity="critical" title="Failed to load overview">
          Check RPC or indexer availability; the UI keeps the last successful snapshot when possible.
        </WarningBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-muted" />)
        ) : (
          <>
            <StatCard label="Total collateral" value={formatUsd(data.totalCollateralUsd, { compact: true })} />
            <StatCard label="Total borrowed" value={formatUsd(data.totalBorrowedUsd, { compact: true })} />
            <StatCard label="Utilization" value={formatBpsAsPercent(data.poolUtilizationBps, 1)} />
            <StatCard label="Borrow APY" value={data.borrowApyLabel} sub={`Supply ${data.supplyApyLabel}`} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-display">Risk signals</CardTitle>
            {dataUpdatedAt ? (
              <span className="text-[10px] text-muted-foreground font-mono">
                Updated {formatRelativeIso(new Date(dataUpdatedAt).toISOString())}
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.alerts ?? []).map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <p className="text-xs text-muted-foreground">{formatRelativeIso(a.at)}</p>
                <p
                  className={
                    a.severity === "critical"
                      ? "text-rose-400"
                      : a.severity === "warning"
                        ? "text-amber-400"
                        : "text-foreground"
                  }
                >
                  {a.message}
                </p>
              </div>
            ))}
            {!isLoading && (!data?.alerts?.length) && <p className="text-sm text-muted-foreground">No queued alerts.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-display">Device classes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Active devices (demo):{" "}
              <span className="text-foreground font-semibold tabular-nums">{data?.activeDevices?.toLocaleString() ?? "—"}</span>
            </p>
            <p>Inspect proof cadence and oracle routes per class in the risk dashboard.</p>
            <Button asChild variant="secondary" className="rounded-lg mt-2">
              <Link to="/risk">Open risk dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
};

export default AnalyticsPage;
