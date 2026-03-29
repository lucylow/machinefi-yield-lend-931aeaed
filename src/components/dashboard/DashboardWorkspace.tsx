import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MyHardware from "@/components/dapp/MyHardware";
import type { HardwareDevice } from "@/hooks/useHardwareNFT";
import type { LoanPosition } from "@/hooks/useLendingPool";
import { MOCK_GOVERNANCE_PROPOSALS } from "@/constants/mockProtocol";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { formatAprFromBps, formatRelativeIso, formatUsd } from "@/lib/format";
import { OracleFreshnessBadge, ProofFreshnessBadge } from "@/components/protocol/FreshnessBadge";
import { ChainBadge } from "@/components/protocol/ChainBadge";
import { EmptyStateCard } from "@/components/protocol/EmptyStateCard";

interface DashboardWorkspaceProps {
  devices: HardwareDevice[];
  loans: LoanPosition[];
  onRepay: (nftId: number) => void;
}

function loanHealthLabel(ltv: number): { label: string; pct: number; variant: "safe" | "warning" | "critical" } {
  if (ltv >= 78) return { label: "Critical", pct: Math.min(100, (ltv / 85) * 100), variant: "critical" };
  if (ltv >= 65) return { label: "Warning", pct: (ltv / 85) * 100, variant: "warning" };
  return { label: "Safe", pct: (ltv / 85) * 100, variant: "safe" };
}

export function DashboardWorkspace({ devices, loans, onRepay }: DashboardWorkspaceProps) {
  const { snapshot } = useProtocolSimulation();
  return (
    <Tabs defaultValue="positions" className="w-full space-y-6">
      <TabsList
        className="flex w-full flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl border border-border/60"
        aria-label="Dashboard sections"
      >
        <TabsTrigger value="positions" className="rounded-lg data-[state=active]:bg-card">
          Active loans
        </TabsTrigger>
        <TabsTrigger value="devices" className="rounded-lg data-[state=active]:bg-card">
          Devices
        </TabsTrigger>
        <TabsTrigger value="yield" className="rounded-lg data-[state=active]:bg-card">
          Yield history
        </TabsTrigger>
        <TabsTrigger value="proofs" className="rounded-lg data-[state=active]:bg-card">
          Proofs
        </TabsTrigger>
        <TabsTrigger value="governance" className="rounded-lg data-[state=active]:bg-card">
          Governance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="positions" className="mt-0 space-y-6 outline-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <OracleFreshnessBadge state="live" />
            <ProofFreshnessBadge minutesAgo={45} />
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
            <Link to="/borrow">Borrow</Link>
          </Button>
        </div>
        {loans.length === 0 ? (
          <EmptyStateCard
            title="No active loans"
            description="You have no drawn positions. Register a device, refresh proofs, then open a conservative borrow against verified collateral value."
            action={
              <Button asChild className="btn-gradient rounded-full text-primary-foreground border-0">
                <Link to="/borrow">Open borrow flow</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {loans.map((loan) => {
              const h = loanHealthLabel(loan.ltv);
              return (
                <Card
                  key={loan.nftId}
                  className={`border-border/60 bg-card/80 backdrop-blur-sm ${
                    h.variant === "critical"
                      ? "ring-1 ring-destructive/40"
                      : h.variant === "warning"
                        ? "ring-1 ring-amber-500/35"
                        : ""
                  }`}
                >
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-display">{loan.deviceType}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">NFT #{loan.nftId}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Health</p>
                      <p className="text-sm font-semibold tabular-nums">
                        <span className="sr-only">Status: </span>
                        {h.label}
                        <span className="text-muted-foreground font-normal"> · LTV {loan.ltv}%</span>
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Distance to liquidation (85%)</span>
                        <span className="tabular-nums text-foreground">{Math.max(0, 85 - loan.ltv).toFixed(1)} pts</span>
                      </div>
                      <Progress value={h.pct} className="h-2 bg-muted" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Debt</p>
                        <p className="font-semibold tabular-nums">${loan.debt}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Collateral</p>
                        <p className="font-semibold tabular-nums">${loan.collateralValue}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Yield locked</p>
                        <p className="font-semibold tabular-nums">{loan.yieldPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">APR (indic.)</p>
                        <p className="font-semibold tabular-nums">6.5%</p>
                      </div>
                    </div>
                    {loan.status === "active" && (
                      <Button
                        type="button"
                        onClick={() => onRepay(loan.nftId)}
                        className="w-full btn-gradient rounded-full text-sm font-semibold text-primary-foreground border-0"
                      >
                        Repay loan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="devices" className="mt-0 outline-none">
        {devices.length === 0 ? (
          <EmptyStateCard
            title="No devices registered"
            description="Collateral starts with a registered machine or RWA. Add metadata and proofs so the pool can mark value conservatively."
            action={
              <Button asChild variant="outline" className="rounded-full border-primary/40">
                <Link to="/hardware/register">Register device</Link>
              </Button>
            }
          />
        ) : (
          <MyHardware devices={devices} />
        )}
      </TabsContent>

      <TabsContent value="yield" className="mt-0 outline-none">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base font-display">Protocol yield history (demo)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.yieldHistory.map((row) => (
              <div
                key={row.at}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3 last:border-0"
              >
                <span className="text-sm text-muted-foreground font-mono">{row.at}</span>
                <span className="text-sm font-semibold tabular-nums">{formatUsd(row.yieldUsd)}</span>
                <span className="text-xs text-primary font-medium">{formatAprFromBps(row.aprBps)} APR</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="proofs" className="mt-0 outline-none">
        <div className="space-y-4">
          {snapshot.proofs.map((p) => (
            <Card key={p.proofId} className="border-border/60 bg-card/80">
              <CardContent className="pt-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ChainBadge chain="greenfield" />
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                      p.verificationStatus === "accepted"
                        ? "border-primary/40 text-primary bg-primary/10"
                        : p.verificationStatus === "pending"
                          ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                          : "border-destructive/40 text-destructive bg-destructive/10"
                    }`}
                  >
                    {p.verificationStatus}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">{p.proofType}</p>
                <p className="text-xs text-muted-foreground">{p.source} · {formatRelativeIso(p.timestamp)}</p>
                <p className="text-xs font-mono text-muted-foreground break-all">{p.storageLocation}</p>
                <p className="text-xs font-mono text-muted-foreground">Ref {p.reference}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="governance" className="mt-0 outline-none">
        <div className="space-y-4">
          {MOCK_GOVERNANCE_PROPOSALS.map((g) => (
            <Card key={g.proposalId} className="border-border/60 bg-card/80">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-mono text-muted-foreground">{g.proposalId}</span>
                  <span className="text-[10px] uppercase font-semibold text-primary">{g.category}</span>
                </div>
                <CardTitle className="text-base font-display pt-1">{g.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>{g.description}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span>Yes {(g.votesYes / 1e6).toFixed(2)}M</span>
                  <span>No {(g.votesNo / 1e6).toFixed(2)}M</span>
                  <span>Abstain {(g.votesAbstain / 1e6).toFixed(2)}M</span>
                </div>
                <p className="text-xs">
                  Execution: <span className="text-foreground font-medium">{g.executionStatus}</span> · Timelock:{" "}
                  <span className="text-foreground font-medium">{g.timelockStatus}</span>
                </p>
                <Button asChild variant="link" className="px-0 h-auto text-primary">
                  <Link to="/governance">Open governance center</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
