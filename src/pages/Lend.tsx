import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPage } from "@/components/layout/AppPage";
import { StatCard } from "@/components/defi/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WarningBanner } from "@/components/defi/WarningBanner";
import { formatUsd, formatAprFromBps } from "@/lib/format";
import { BASE_INTEREST_RATE_BPS } from "@/constants/addresses";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { useState } from "react";
import { TransactionModal, type TxPhase } from "@/components/defi/TransactionModal";
import { toast } from "sonner";
import { PieChart } from "lucide-react";
import { DataTable } from "@/components/defi/DataTable";

async function fetchLenderDemo() {
  await new Promise((r) => setTimeout(r, 100));
  return {
    suppliedUsd: 42_500,
    earnedUsd: 1_240.6,
    withdrawableUsd: 42_500,
    poolShareBps: 18,
  };
}

const LendPage = () => {
  const { snapshot } = useProtocolSimulation();
  const o = snapshot.overview;
  const { data, isLoading } = useQuery({ queryKey: ["lender-panel"], queryFn: fetchLenderDemo });
  const [deposit, setDeposit] = useState("");
  const [withdraw, setWithdraw] = useState("");
  const [modal, setModal] = useState<{ open: boolean; kind: "deposit" | "withdraw"; phase: TxPhase }>({
    open: false,
    kind: "deposit",
    phase: "review",
  });

  const utilizationPct = o.poolUtilizationBps / 100;
  const supplyApy = formatAprFromBps(o.supplyApyBps || BASE_INTEREST_RATE_BPS);
  const borrowApy = formatAprFromBps(BASE_INTEREST_RATE_BPS + 150);

  const submit = async () => {
    setModal((m) => ({ ...m, phase: "pending" }));
    await new Promise((r) => setTimeout(r, 900));
    setModal((m) => ({ ...m, phase: "success" }));
    toast.success(modal.kind === "deposit" ? "Deposit submitted (demo)" : "Withdraw submitted (demo)");
  };

  return (
    <AppPage>
      <PageHeader
        eyebrow="Liquidity"
        title="Lend / supply"
        description="Supply stablecoins into the machine-backed credit pool. Utilization and class-level exposure should be monitored — this view is wired for demo data with RPC-ready hooks."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pool liquidity"
          value={formatUsd(PROTOCOL_OVERVIEW_STATS.totalCollateralUsd * 0.2, { compact: true })}
          sub="Demo TVL proxy"
        />
        <StatCard label="Utilization" value={`${utilizationPct.toFixed(1)}%`} sub="Borrowed / supplied" />
        <StatCard label="Supply APY" value={supplyApy} sub="Before MACH boost" trend="up" />
        <StatCard label="Borrow APY" value={borrowApy} sub="Variable with utilization" />
      </div>

      <WarningBanner severity="warning" title="Pool risk">
        Exposure is concentrated in DePIN device classes with oracle and proof cadence risk. Review the analytics tab for class-level stress before sizing deposits.
      </WarningBanner>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-display">Your supplier account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !data ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border/50 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Supplied</p>
                  <p className="font-mono font-semibold tabular-nums">{formatUsd(data.suppliedUsd)}</p>
                </div>
                <div className="rounded-lg border border-border/50 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Lifetime earned</p>
                  <p className="font-mono font-semibold tabular-nums">{formatUsd(data.earnedUsd)}</p>
                </div>
                <div className="rounded-lg border border-border/50 p-3 col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Withdrawable</p>
                  <p className="font-mono font-semibold tabular-nums">{formatUsd(data.withdrawableUsd)}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dep">Deposit amount (USDC)</Label>
              <div className="flex gap-2">
                <Input
                  id="dep"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="0.00"
                  className="rounded-lg font-mono border-border bg-background"
                />
                <Button
                  type="button"
                  className="rounded-lg btn-gradient text-primary-foreground border-0 shrink-0"
                  onClick={() => setModal({ open: true, kind: "deposit", phase: "review" })}
                >
                  Deposit
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wdr">Withdraw amount</Label>
              <div className="flex gap-2">
                <Input
                  id="wdr"
                  value={withdraw}
                  onChange={(e) => setWithdraw(e.target.value)}
                  placeholder="0.00"
                  className="rounded-lg font-mono border-border bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg border-border"
                  onClick={() => setModal({ open: true, kind: "withdraw", phase: "review" })}
                >
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <PieChart className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle className="text-base font-display">Device-class exposure (demo)</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              rowKey={(r) => r.cls}
              rows={[
                { cls: "Helium / IoT", bps: 3800, risk: "Oracle variance" },
                { cls: "Hivemapper", bps: 2900, risk: "Proof cadence" },
                { cls: "EV / charge", bps: 2200, risk: "Regulatory" },
                { cls: "Other DePIN", bps: 1100, risk: "Mixed" },
              ]}
              columns={[
                { key: "c", header: "Class", cell: (r) => r.cls },
                { key: "w", header: "Pool mix", cell: (r) => `${(r.bps / 100).toFixed(1)}%` },
                { key: "r", header: "Watch", cell: (r) => <span className="text-muted-foreground text-xs">{r.risk}</span> },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <TransactionModal
        open={modal.open}
        onOpenChange={(o) => setModal((m) => ({ ...m, open: o }))}
        title={modal.kind === "deposit" ? "Deposit stablecoin" : "Withdraw stablecoin"}
        phase={modal.phase}
        gasLabel="~0.00012 BNB"
        onConfirm={submit}
        confirmLabel="Confirm in wallet"
      >
        <p className="text-xs text-muted-foreground">
          Summary: {modal.kind === "deposit" ? `Deposit $${deposit || "0"} USDC` : `Withdraw $${withdraw || "0"} USDC`} on BNB Chain
          (demo transaction).
        </p>
      </TransactionModal>
    </AppPage>
  );
};

export default LendPage;
