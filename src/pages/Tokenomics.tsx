import { Link } from "react-router-dom";
import { AppPage } from "@/components/Layout/AppPage";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/protocol/InfoRow";
import { Button } from "@/components/ui/button";
import { MOCK_FEE_GOVERNANCE, MOCK_TREASURY_HEALTH } from "@/constants/mockProtocol";
import { MACH_STAKE_TIER_THRESHOLDS_MACH } from "@/lib/feeMath";
import { formatBpsAsPercent } from "@/lib/format";
import { BookOpen, Landmark, Shield, Vote } from "lucide-react";

const REVENUE_PRIORITY = [
  "Protocol safety — accurate collateral marks, solvency, risk modes",
  "Lender obligations — LP yield and principal protection",
  "Insurance / reserve funding — backstop depth",
  "Treasury runway — operations and audits",
  "MACH staker routing — share of routed fees (recipient is configurable)",
  "Discretionary incentives — last, capped off-chain / via LiquidityEmissionController",
] as const;

export default function Tokenomics() {
  const fg = MOCK_FEE_GOVERNANCE;

  return (
    <AppPage>
      <PageHeader
        eyebrow="Protocol"
        title="Tokenomics & incentives"
        description="How MACH coordinates governance and fee utility, how revenue is routed and bounded on-chain, and how treasury and insurance fit the DePIN lending economy — aligned with docs/TOKENOMICS.md (§13)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
              <Link to="/protocol/revenue">Revenue charts</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
              <Link to="/governance">Governance</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="border-border/60 bg-card/85">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Vote className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <CardTitle className="text-base font-display">MACH utility (explicit)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">Governance:</span> ERC-20 votes power proposals via the timelock governor.
              Staked MACH lives in the staking contract — plan delegation vs stake size deliberately.
            </p>
            <p>
              <span className="text-foreground font-medium">Fee utility:</span> On-chain <code className="text-xs bg-muted px-1 rounded">MACHStaking</code> tiers
              (≥{MACH_STAKE_TIER_THRESHOLDS_MACH.join("/")} MACH) map to 5/10/15 bps off <em>origination</em> only, capped by the pool.
            </p>
            <p>
              <span className="text-foreground font-medium">Not collateral:</span> MACH does not change LTV or liquidation; machines and oracles do.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/85">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Landmark className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <CardTitle className="text-base font-display">Revenue routing & stress mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground text-xs mb-2">
              Every fee leg emits <code className="bg-muted px-1 rounded">FeeCharged</code> in the pool, then{" "}
              <code className="bg-muted px-1 rounded">FeeRouted</code> / <code className="bg-muted px-1 rounded">FeeDistributed</code> in the router.
              Turning on <code className="bg-muted px-1 rounded">conservativeRevenueMode</code> applies the stress split (higher LP + insurance floors).
            </p>
            <InfoRow label="LP share" value={formatBpsAsPercent(fg.globalFeeRouting.liquidityProvidersBps, 1)} />
            <InfoRow label="Treasury" value={formatBpsAsPercent(fg.globalFeeRouting.treasuryBps, 1)} />
            <InfoRow label="Stakers (recipient)" value={formatBpsAsPercent(fg.globalFeeRouting.machStakersBps, 1)} />
            <InfoRow label="Insurance" value={formatBpsAsPercent(fg.globalFeeRouting.insuranceReserveBps, 1)} />
            <InfoRow label="Growth (capped in normal mode)" value={formatBpsAsPercent(fg.globalFeeRouting.growthFundBps, 1)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="border-border/60 bg-card/85">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Shield className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <CardTitle className="text-base font-display">Treasury hub & insurance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Treasury share can flow to <code className="text-xs bg-muted px-1 rounded">TreasuryHub</code>, which books five categories
              (protocol revenue, reserve, operations, incentives, insurance backstop) for auditor-grade trails.
            </p>
            <p>
              <code className="text-xs bg-muted px-1 rounded">InsuranceReserve</code> is governance-drawn for shortfalls — not silent auto-pay.
            </p>
            <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Demo reserve narrative</p>
              <p className="text-foreground tabular-nums">{MOCK_TREASURY_HEALTH.narrative}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/85">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <CardTitle className="text-base font-display">Revenue priority (policy)</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {REVENUE_PRIORITY.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/85 mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Borrow preview & total cost</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use <code className="bg-muted px-1 rounded">LendingPool.previewOpenPositionFees</code> before <code className="bg-muted px-1 rounded">deposit</code> for
            origination, verification, net disbursement, and effective origination bps (includes MACH discount when the module is set). The borrow wizard uses the same tier math in{" "}
            <Link to="/borrow" className="text-primary underline-offset-4 hover:underline">
              Borrow
            </Link>
            .
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Estimated protocol interest over a horizon is shown in the flow as borrower vs lender APR; liquidation protocol fee is a separate line item on total owed.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Full specification: <code className="bg-muted px-1 rounded">docs/TOKENOMICS.md</code> · On-chain tests:{" "}
        <code className="bg-muted px-1 rounded">npm run test:contracts</code>
      </p>
    </AppPage>
  );
}
