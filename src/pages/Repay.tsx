import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useLendingPool, type LoanPosition } from "@/hooks/useLendingPool";
import { toast } from "sonner";
import { getLoadErrorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/Layout/PageHeader";
import { AppPage } from "@/components/Layout/AppPage";
import { EmptyStateCard } from "@/components/protocol/EmptyStateCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HealthBar } from "@/components/defi/HealthBar";
import { healthFactorFromUsd, parseUsd } from "@/lib/healthFactor";
import { TransactionModal, type TxPhase } from "@/components/defi/TransactionModal";
import { WarningBanner } from "@/components/defi/WarningBanner";
import { DemoModeBadge } from "@/components/demo/DemoModeBadge";

const RepayPage = () => {
  const { isConnected, connectWallet } = useWeb3();
  const { getUserPositions, repay, loading, isDemoMode } = useLendingPool();
  const [loans, setLoans] = useState<LoanPosition[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [pct, setPct] = useState(100);
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<TxPhase>("review");
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected && !isDemoMode) return;
    let cancelled = false;
    getUserPositions()
      .then((l) => {
        if (!cancelled) {
          const active = l.filter((x) => x.status === "active");
          setLoans(active);
          setSelectedId((prev) => (prev === "" && active.length ? String(active[0].nftId) : prev));
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(getLoadErrorMessage(err, "Could not load loans."));
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, isDemoMode, getUserPositions]);

  const loan = useMemo(() => loans.find((l) => String(l.nftId) === selectedId) ?? null, [loans, selectedId]);

  const collateral = loan ? parseUsd(loan.collateralValue) : 0;
  const debt = loan ? parseUsd(loan.debt) : 0;
  const interestUsd = loan?.accruedInterestUsd ?? 0;
  const principalUsd = loan ? Math.max(0, loan.principalUsd) : 0;
  const payAmount = (debt * pct) / 100;
  const remainingAfter = Math.max(0, debt - payAmount);
  const hfAfter = healthFactorFromUsd(collateral, remainingAfter);

  const runRepay = async () => {
    if (!loan) return;
    setPhase("pending");
    setTxHash(null);
    try {
      const ok = await repay(loan.nftId);
      if (ok) {
        setPhase("success");
        setTxHash("0x" + "demo".padEnd(64, "0"));
        const next = await getUserPositions();
        setLoans(next);
      } else {
        setPhase("error");
      }
    } catch {
      setPhase("error");
    }
  };

  return (
    <AppPage>
      <PageHeader
        eyebrow="Debt reduction"
        title="Repay"
        description="Review principal vs interest, simulate health after repayment, then execute a full on-chain repay (partial flows follow the same safety checks once the pool supports them)."
        actions={
          <Button asChild variant="ghost" size="sm" className="rounded-lg text-muted-foreground">
            <Link to="/positions">Positions</Link>
          </Button>
        }
      />

      {!isConnected && !isDemoMode ? (
        <EmptyStateCard
          title="Wallet required"
          description="Repay transactions are signed by your wallet; stablecoin allowance may be requested before the pool pull."
          action={
            <Button type="button" onClick={connectWallet} className="btn-gradient rounded-lg text-primary-foreground border-0">
              Connect wallet
            </Button>
          }
        />
      ) : loans.length === 0 ? (
        <EmptyStateCard title="Nothing to repay" description="You have no active machine-backed debt in this demo set." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <WarningBanner severity="info" title="Current pool behavior">
            The deployed demo repays the full outstanding balance (principal + accrued interest). Use the slider to model a partial repayment; on-chain support will mirror the same health previews.
          </WarningBanner>

          <Card className="lg:col-span-2 border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="text-base font-display">Select position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-md">
                <Label>Loan</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="rounded-lg border-border bg-background">
                    <SelectValue placeholder="Choose position" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card">
                    {loans.map((l) => (
                      <SelectItem key={l.nftId} value={String(l.nftId)}>
                        #{l.nftId} · {l.deviceType} · ${l.debt} owed
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loan && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border border-border/50 p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Principal (est.)</p>
                      <p className="font-mono font-semibold">${principalUsd.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-border/50 p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Interest (est.)</p>
                      <p className="font-mono font-semibold">${interestUsd.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <Label>Repayment amount</Label>
                      <span className="font-mono tabular-nums">${payAmount.toFixed(2)}</span>
                    </div>
                    <Slider value={[pct]} min={1} max={100} step={1} onValueChange={(v) => setPct(v[0] ?? 100)} />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setPct(100)}>
                        Repay max
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">After this payment</p>
                    <HealthBar healthFactor={hfAfter} />
                    <p className="text-xs text-muted-foreground">
                      Remaining debt: <span className="font-mono text-foreground">${remainingAfter.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Collateral unlocks only after debt reaches zero and the pool releases the NFT lien (contract-specific).
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={loading}
                      className="rounded-lg btn-gradient text-primary-foreground border-0"
                      onClick={() => {
                        setTxHash(null);
                        setPhase("review");
                        setModalOpen(true);
                      }}
                    >
                      Preview transaction
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Repay stablecoin"
        description="You will approve the pool if needed, then confirm the repay transaction in your wallet."
        phase={phase}
        txHash={txHash}
        gasLabel="~0.00015 BNB"
        onConfirm={runRepay}
        confirmLabel="Sign & repay"
      >
        {loan && phase === "review" && (
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>
              Position #{loan.nftId} · {loan.deviceType}
            </li>
            <li>Repay amount (UI model): ${payAmount.toFixed(2)}</li>
            <li>On-chain: full balance repayment in current build</li>
          </ul>
        )}
      </TransactionModal>
    </AppPage>
  );
};

export default RepayPage;
