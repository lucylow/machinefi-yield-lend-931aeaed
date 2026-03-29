import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPage } from "@/components/layout/AppPage";
import { InfoRow } from "@/components/protocol/InfoRow";
import { Progress } from "@/components/ui/progress";
import { useWeb3 } from "@/contexts/Web3Context";
import { EmptyStateCard } from "@/components/protocol/EmptyStateCard";
import { DEVICE_CLASS_PROFILES, resolveDeviceClassFromRoute } from "@/constants/deviceFees";
import {
  computeBorrowQuoteFees,
  interestUsdLinear,
  lenderInterestUsdLinear,
  liquidationProtocolFeeUsd,
  machOriginationDiscountBps,
  protocolInterestShareUsd,
} from "@/lib/feeMath";
import { formatBpsAsPercent, formatUsd } from "@/lib/format";
import { ArrowLeft, BadgeCheck, Check, ChevronRight, Sparkles, Wallet } from "lucide-react";
import { useCompliance } from "@/contexts/ComplianceContext";
import { RiskAcknowledgmentCard } from "@/components/compliance/RiskAcknowledgmentCard";
import { NonCustodialCallout } from "@/components/compliance/NonCustodialCallout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const STEPS = ["Asset", "Collateral", "Amount", "Risk", "Confirm"] as const;
const HORIZON_DAYS = 90;

export default function BorrowFlow() {
  const { type, id } = useParams();
  const { isConnected, connectWallet } = useWeb3();
  const { gateFor, acknowledgeCurrentDisclosures } = useCompliance();
  const [, bumpAfterDisclosureAck] = useState(0);
  const borrowGate = gateFor("borrow");
  const onDisclosureAck = useCallback(() => {
    if (borrowGate.requiresDisclosureIds?.length) {
      acknowledgeCurrentDisclosures(borrowGate.requiresDisclosureIds);
    }
    bumpAfterDisclosureAck((n) => n + 1);
  }, [borrowGate.requiresDisclosureIds, acknowledgeCurrentDisclosures]);
  const [step, setStep] = useState(0);
  const [premium, setPremium] = useState(false);
  const [machStakeUsd, setMachStakeUsd] = useState(3_000);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState(false);

  const { snapshot } = useProtocolSimulation();
  const deviceKey = resolveDeviceClassFromRoute(type);
  const feeProfile = DEVICE_CLASS_PROFILES[deviceKey];

  const asset = useMemo(
    () => ({
      ...snapshot.primaryBorrowAsset,
      class: feeProfile.label,
      id: id ?? snapshot.primaryBorrowAsset.id,
    }),
    [feeProfile.label, id, snapshot.primaryBorrowAsset]
  );

  const maxBorrow = useMemo(() => {
    const cf =
      asset.collateralFactorBps + (premium ? feeProfile.premiumCollateralFactorBonusBps : 0);
    return (asset.valueUsd * cf) / 10_000;
  }, [asset.valueUsd, asset.collateralFactorBps, premium, feeProfile.premiumCollateralFactorBonusBps]);

  const [amountUsd, setAmountUsd] = useState(() => {
    const b = snapshot.primaryBorrowAsset;
    return Math.round((b.valueUsd * b.collateralFactorBps * 0.45) / 10_000);
  });

  useEffect(() => {
    setAmountUsd((a) => Math.min(a, Math.max(100, Math.floor(maxBorrow))));
  }, [maxBorrow]);

  const quote = useMemo(
    () => computeBorrowQuoteFees(amountUsd, feeProfile, { premium, stakedMachUsd: machStakeUsd }),
    [amountUsd, feeProfile, premium, machStakeUsd]
  );

  const interestBorrower = interestUsdLinear(amountUsd, feeProfile.borrowerAprBps, HORIZON_DAYS);
  const interestLender = lenderInterestUsdLinear(amountUsd, feeProfile.lenderAprBps, HORIZON_DAYS);
  const interestProtocol = protocolInterestShareUsd(amountUsd, feeProfile, HORIZON_DAYS);
  const liqFeeIfMaxed = liquidationProtocolFeeUsd(amountUsd + interestBorrower, feeProfile.liquidationFeeBps);

  const ltvBps = asset.valueUsd > 0 ? Math.round((amountUsd / asset.valueUsd) * 10_000) : 0;
  const effectiveCfBps = asset.collateralFactorBps + (premium ? feeProfile.premiumCollateralFactorBonusBps : 0);
  const liqThreshold = asset.liquidationThresholdBps;
  const bufferBps = liqThreshold - ltvBps;
  const highLtv = ltvBps >= effectiveCfBps - 300;

  const machDiscBps = machOriginationDiscountBps(machStakeUsd);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  if (!isConnected) {
    return (
      <AppPage>
        <PageHeader title="Borrow" description="Connect a wallet to run the guided borrow simulation." eyebrow="Flow" />
        <EmptyStateCard
          title="Wallet not connected"
          description="The borrow wizard needs an address to attribute the position and preview limits."
          icon={<Wallet className="h-10 w-10 mx-auto text-primary" aria-hidden />}
          action={
            <Button type="button" onClick={connectWallet} className="btn-gradient rounded-full text-primary-foreground border-0">
              Connect wallet
            </Button>
          }
        />
      </AppPage>
    );
  }

  if (!borrowGate.allowed && borrowGate.mode === "blocked") {
    return (
      <AppPage>
        <PageHeader title="Borrow unavailable" description={borrowGate.message} eyebrow="Policy" />
        <Alert variant="destructive" className="max-w-xl border-red-500/50">
          <AlertTitle className="font-display text-sm">Action blocked</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>{borrowGate.message}</p>
            {borrowGate.recoveryHint && <p className="text-muted-foreground">{borrowGate.recoveryHint}</p>}
          </AlertDescription>
        </Alert>
      </AppPage>
    );
  }

  if (!borrowGate.allowed && borrowGate.mode === "needs_ack" && borrowGate.requiresDisclosureIds?.length) {
    return (
      <AppPage>
        <PageHeader
          title="Borrow — disclosures"
          description="Acknowledge risks before continuing the guided flow. Policy is driven by your declared jurisdiction and path."
          eyebrow="Compliance"
        />
        <div className="max-w-lg mx-auto space-y-4">
          <NonCustodialCallout />
          <RiskAcknowledgmentCard
            disclosureIds={borrowGate.requiresDisclosureIds}
            onAcknowledge={onDisclosureAck}
            submitLabel="Acknowledge and open borrow flow"
          />
        </div>
      </AppPage>
    );
  }

  if (done) {
    return (
      <AppPage>
        <PageHeader title="Position opened (demo)" description="Summary of your simulated borrow." eyebrow="Complete" />
        <Card className="border-primary/30 bg-card/90 max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Check className="h-5 w-5 text-primary" aria-hidden />
              Loan summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Asset" value={asset.class} />
            {premium && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Premium operator tier
              </div>
            )}
            <InfoRow label="Principal (debt)" value={formatUsd(amountUsd)} />
            <InfoRow label="You received" value={formatUsd(quote.netDisbursementUsd)} />
            <InfoRow label="Protocol fees (orig. + verify)" value={formatUsd(quote.totalFeesUsd)} />
            <InfoRow label="LTV" value={formatBpsAsPercent(ltvBps, 1)} />
            <InfoRow label="Liquidation threshold" value={formatBpsAsPercent(liqThreshold, 0)} />
            <Button asChild variant="outline" className="w-full mt-4 rounded-full border-primary/40">
              <Link to="/dashboard">View dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2 mb-4">
          <Link to="/borrow">
            <ArrowLeft className="h-4 w-4" />
            Back to borrow hub
          </Link>
        </Button>
        <PageHeader
          title="Guided borrow"
          description="Explicit principal, protocol fees, borrower vs lender APR, and reserve contribution — aligned with on-chain class fees and RevenueRouter."
          eyebrow="Simulation"
          actions={
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40 text-xs">
                <Link to="/protocol/revenue">Fee routing</Link>
              </Button>
              <span className="text-xs font-mono text-muted-foreground">
                {type ?? "—"} / {id ?? "—"}
              </span>
            </div>
          }
        />
      </div>

      <div className="max-w-2xl mx-auto">
        {borrowGate.mode === "warn" && borrowGate.message && (
          <Alert className="mb-4 border-amber-500/40 bg-amber-500/10">
            <AlertTitle className="text-amber-100 text-sm font-display">Notice</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">{borrowGate.message}</AlertDescription>
          </Alert>
        )}
        <NonCustodialCallout />
        <div className="rounded-xl border border-border/60 bg-muted/15 p-4 mb-6 space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="premium" checked={premium} onCheckedChange={setPremium} />
              <Label htmlFor="premium" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" aria-hidden />
                Premium operator (faster proofs, richer analytics, higher ceiling)
              </Label>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Simulated MACH staked (USD) — origination discount</Label>
            <Slider
              className="mt-2"
              value={[machStakeUsd]}
              min={0}
              max={60_000}
              step={500}
              onValueChange={(v) => setMachStakeUsd(v[0])}
              aria-label="MACH staked USD"
            />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>{formatUsd(machStakeUsd)} staked</span>
              <span>MACH discount on origination: −{machDiscBps} bps</span>
            </div>
          </div>
        </div>

        <ol className="flex flex-wrap gap-2 mb-8" aria-label="Borrow steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-1 text-xs">
              <span
                className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border tabular-nums ${
                  i === step
                    ? "border-primary bg-primary/15 text-primary font-semibold"
                    : i < step
                      ? "border-border text-muted-foreground"
                      : "border-border/60 text-muted-foreground/70"
                }`}
                aria-current={i === step ? "step" : undefined}
              >
                {i + 1}
              </span>
              <span className={i === step ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-border mx-0.5 hidden sm:inline" aria-hidden />}
            </li>
          ))}
        </ol>

        <Card className="border-border/60 bg-card/85 backdrop-blur-sm min-h-[320px]">
          <CardContent className="pt-8 pb-6 px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {step === 0 && (
                  <>
                    <h2 className="text-lg font-semibold font-display">Select asset context</h2>
                    <p className="text-sm text-muted-foreground">
                      Device class drives fee profiles on BNB Chain: origination, verification, borrower/lender APR spread,
                      and liquidation fee. Governance can adjust bounds without touching your collateral custody policy.
                    </p>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm space-y-1">
                      <p className="font-semibold text-foreground">{asset.class}</p>
                      <p className="text-muted-foreground font-mono text-xs">ID {asset.id}</p>
                      <p className="text-xs text-muted-foreground pt-2">
                        Class fees: orig {formatBpsAsPercent(feeProfile.originationFeeBps, 2)} · verify{" "}
                        {formatBpsAsPercent(feeProfile.verificationFeeBps, 2)} · spread{" "}
                        {formatBpsAsPercent(quote.protocolSpreadBps, 2)} APR
                      </p>
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <h2 className="text-lg font-semibold font-display">Verified collateral value</h2>
                    <p className="text-sm text-muted-foreground">
                      Mark from the latest accepted proof bundle. Haircuts apply until verification completes.
                    </p>
                    <InfoRow label="Collateral value" value={formatUsd(asset.valueUsd)} />
                    <InfoRow
                      label="Collateral factor"
                      value={formatBpsAsPercent(effectiveCfBps, 0)}
                    />
                    <InfoRow label="Borrow limit" value={formatUsd(maxBorrow)} />
                    <InfoRow label="Liquidation threshold" value={formatBpsAsPercent(liqThreshold, 0)} />
                  </>
                )}
                {step === 2 && (
                  <>
                    <h2 className="text-lg font-semibold font-display">Borrow amount</h2>
                    <p className="text-sm text-muted-foreground">Principal is what you owe; fees are deducted from what hits your wallet.</p>
                    <div className="py-4">
                      <Slider
                        value={[amountUsd]}
                        min={100}
                        max={Math.max(100, Math.floor(maxBorrow))}
                        step={50}
                        onValueChange={(v) => setAmountUsd(v[0])}
                        aria-label="Borrow amount in USD"
                      />
                      <div className="flex justify-between mt-3 text-sm">
                        <span className="text-muted-foreground">Principal (debt)</span>
                        <span className="font-semibold tabular-nums">{formatUsd(amountUsd)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-sm space-y-2">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Quote breakdown</p>
                      <InfoRow label="You receive" value={formatUsd(quote.netDisbursementUsd)} />
                      <InfoRow label="Protocol fee (origination)" value={formatUsd(quote.originationUsd)} />
                      <InfoRow label="Verification fee" value={formatUsd(quote.verificationUsd)} />
                      <InfoRow label="Borrower APR" value={formatBpsAsPercent(feeProfile.borrowerAprBps, 2)} />
                      <InfoRow label="Lender yield (net to LPs)" value={formatBpsAsPercent(feeProfile.lenderAprBps, 2)} />
                      <p className="text-xs text-muted-foreground pt-1">
                        Part of ongoing interest funds treasury, insurance, and infrastructure via the spread (
                        {formatBpsAsPercent(quote.protocolSpreadBps, 2)} APR).
                      </p>
                    </div>
                  </>
                )}
                {step === 3 && (
                  <>
                    <h2 className="text-lg font-semibold font-display">Risk preview</h2>
                    <div className="space-y-3 text-sm">
                      <InfoRow label="Projected LTV" value={formatBpsAsPercent(ltvBps, 1)} />
                      <InfoRow label="Liquidation buffer" value={formatBpsAsPercent(Math.max(0, bufferBps), 1)} />
                      <div>
                        <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                          <span>LTV vs liquidation</span>
                          <span className="tabular-nums text-foreground">
                            {formatBpsAsPercent(ltvBps, 0)} / {formatBpsAsPercent(liqThreshold, 0)}
                          </span>
                        </div>
                        <Progress value={Math.min(100, (ltvBps / liqThreshold) * 100)} className="h-2" />
                      </div>
                      <div className="rounded-lg border border-border/50 p-3 space-y-2 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground text-sm">Interest over {HORIZON_DAYS}d (indicative)</p>
                        <InfoRow label="You pay (borrower)" value={formatUsd(interestBorrower)} />
                        <InfoRow label="Lenders receive" value={formatUsd(interestLender)} />
                        <InfoRow label="Reserve / protocol (spread)" value={formatUsd(interestProtocol)} />
                        <p className="pt-1">
                          If liquidated at max stress, protocol liquidation fee (on debt + interest) is about{" "}
                          <span className="text-foreground font-medium tabular-nums">{formatUsd(liqFeeIfMaxed)}</span> —{" "}
                          enough to fund keepers and reserves, not a punitive trap.
                        </p>
                      </div>
                      {highLtv && (
                        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs p-3" role="alert">
                          High utilization: you are close to the governance collateral factor. A proof downgrade or oracle
                          move could reduce buffer quickly.
                        </p>
                      )}
                    </div>
                  </>
                )}
                {step === 4 && (
                  <>
                    <h2 className="text-lg font-semibold font-display">Confirm</h2>
                    <p className="text-sm text-muted-foreground">
                      Demo preview — on-chain, fees route through RevenueRouter to LPs, treasury, stakers, insurance, and growth per governance weights.
                    </p>
                    <div className="rounded-xl border border-border/60 divide-y divide-border/50 text-sm">
                      <div className="p-3 flex justify-between gap-4">
                        <span className="text-muted-foreground">Principal (debt)</span>
                        <span className="font-semibold tabular-nums">{formatUsd(amountUsd)} USDC</span>
                      </div>
                      <div className="p-3 flex justify-between gap-4">
                        <span className="text-muted-foreground">You receive</span>
                        <span className="font-semibold tabular-nums text-primary">{formatUsd(quote.netDisbursementUsd)}</span>
                      </div>
                      <div className="p-3 flex justify-between gap-4">
                        <span className="text-muted-foreground">Protocol fee</span>
                        <span className="font-semibold tabular-nums">{formatUsd(quote.totalFeesUsd)}</span>
                      </div>
                      <div className="p-3 flex justify-between gap-4">
                        <span className="text-muted-foreground">LTV after draw</span>
                        <span className="font-semibold tabular-nums">{formatBpsAsPercent(ltvBps, 1)}</span>
                      </div>
                      <div className="p-3 flex justify-between gap-4">
                        <span className="text-muted-foreground">Spread (treasury / insurance / ops)</span>
                        <span className="tabular-nums">{formatBpsAsPercent(quote.protocolSpreadBps, 2)} APR</span>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-wrap gap-3 mt-8 pt-4 border-t border-border/60">
              <Button type="button" variant="outline" className="rounded-full" onClick={goBack} disabled={step === 0}>
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" className="btn-gradient rounded-full text-primary-foreground border-0" onClick={goNext}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  className="btn-gradient rounded-full text-primary-foreground border-0"
                  onClick={() => (highLtv ? setConfirmOpen(true) : setDone(true))}
                >
                  {highLtv ? "Review & confirm" : "Confirm borrow"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Confirm high LTV borrow?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Projected LTV is {formatBpsAsPercent(ltvBps, 1)} with only {formatBpsAsPercent(Math.max(0, bufferBps), 1)} buffer
              to liquidation at {formatBpsAsPercent(liqThreshold, 0)}. Proceed only if you accept liquidation and margin risk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="btn-gradient rounded-full text-primary-foreground border-0"
              onClick={() => {
                setConfirmOpen(false);
                setDone(true);
              }}
            >
              Confirm borrow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPage>
  );
}
