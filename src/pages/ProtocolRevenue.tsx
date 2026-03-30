import { Link } from "react-router-dom";
import { AppPage } from "@/components/Layout/AppPage";
import { PageHeader } from "@/components/Layout/PageHeader";
import { TreasuryFlywheelCard } from "@/components/protocol/TreasuryFlywheelCard";
import { RevenueBySourceChart } from "@/components/protocol/RevenueBySourceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/protocol/InfoRow";
import { Button } from "@/components/ui/button";
import { MOCK_FEE_GOVERNANCE, MOCK_REVENUE_BY_SOURCE, MOCK_TREASURY_HEALTH } from "@/constants/mockProtocol";
import { B2B_INTEGRATION_TIERS } from "@/lib/feeMath";
import { formatBpsAsPercent, formatRelativeIso, formatUsd } from "@/lib/format";
import { DEVICE_CLASS_PROFILES, type DeviceClassKey } from "@/constants/deviceFees";

const CLASS_ORDER: DeviceClassKey[] = ["helium", "hivemapper", "tesla", "custom"];

export default function ProtocolRevenue() {
  const fg = MOCK_FEE_GOVERNANCE;

  return (
    <AppPage>
      <PageHeader
        eyebrow="Protocol"
        title="Revenue & treasury"
        description="Transparent fee routing: liquidity providers, treasury, MACH stakers, insurance, and growth — each stream ties to an on-chain or metered off-chain action."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
              <Link to="/protocol/tokenomics">Tokenomics (§13)</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
              <Link to="/governance">Governance levers</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-1">
          <TreasuryFlywheelCard snapshot={MOCK_TREASURY_HEALTH} />
        </div>
        <div className="lg:col-span-2">
          <RevenueBySourceChart data={MOCK_REVENUE_BY_SOURCE} period="30d" title="Revenue by product line (30d)" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="border-border/60 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Fee routing (governance)</CardTitle>
            <p className="text-xs text-muted-foreground">Deterministic split after fees hit RevenueRouter. Updated {formatRelativeIso(fg.lastUpdated)}.</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Liquidity providers" value={formatBpsAsPercent(fg.globalFeeRouting.liquidityProvidersBps, 1)} />
            <InfoRow label="Protocol treasury" value={formatBpsAsPercent(fg.globalFeeRouting.treasuryBps, 1)} />
            <InfoRow label="MACH stakers" value={formatBpsAsPercent(fg.globalFeeRouting.machStakersBps, 1)} />
            <InfoRow label="Insurance reserve" value={formatBpsAsPercent(fg.globalFeeRouting.insuranceReserveBps, 1)} />
            <InfoRow label="Growth fund" value={formatBpsAsPercent(fg.globalFeeRouting.growthFundBps, 1)} />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Treasury buckets</CardTitle>
            <p className="text-xs text-muted-foreground">How the treasury share is earmarked for reporting (sub-allocation).</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Protocol revenue" value={formatBpsAsPercent(fg.treasuryBucketsBps.protocolRevenue, 1)} />
            <InfoRow label="Reserve capital" value={formatBpsAsPercent(fg.treasuryBucketsBps.reserveCapital, 1)} />
            <InfoRow label="Operational" value={formatBpsAsPercent(fg.treasuryBucketsBps.operational, 1)} />
            <InfoRow label="Incentives" value={formatBpsAsPercent(fg.treasuryBucketsBps.incentives, 1)} />
            <InfoRow label="Insurance backstop" value={formatBpsAsPercent(fg.treasuryBucketsBps.insuranceBackstop, 1)} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/85 mb-8">
        <CardHeader>
          <CardTitle className="text-base font-display">Device-class fee profiles</CardTitle>
          <p className="text-sm text-muted-foreground">
            On-chain `LendingPool.classFees` mirrors these defaults: different DePIN economics → different origination, verification, spread, and liquidation fees.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border/60">
                <th className="pb-2 pr-4">Class</th>
                <th className="pb-2 pr-4">Orig.</th>
                <th className="pb-2 pr-4">Verify</th>
                <th className="pb-2 pr-4">Borrow APR</th>
                <th className="pb-2 pr-4">Lender APR</th>
                <th className="pb-2">Liq. fee</th>
              </tr>
            </thead>
            <tbody>
              {CLASS_ORDER.map((k) => {
                const p = DEVICE_CLASS_PROFILES[k];
                return (
                  <tr key={k} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-4 font-medium">{p.label}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatBpsAsPercent(p.originationFeeBps, 2)}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatBpsAsPercent(p.verificationFeeBps, 2)}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatBpsAsPercent(p.borrowerAprBps, 2)}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatBpsAsPercent(p.lenderAprBps, 2)}</td>
                    <td className="py-2 tabular-nums">{formatBpsAsPercent(p.liquidationFeeBps, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueBySourceChart data={MOCK_REVENUE_BY_SOURCE} period="24h" title="Fees earned today (attributed)" />
        <Card className="border-border/60 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">B2B integrations (non-cyclical)</CardTitle>
            <p className="text-xs text-muted-foreground">Metered API, analytics, and white-label risk surfaces.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {B2B_INTEGRATION_TIERS.map((t) => (
              <div key={t.id} className="flex justify-between gap-4 text-sm border-b border-border/40 last:border-0 pb-2 last:pb-0">
                <span className="text-muted-foreground">{t.name}</span>
                <span className="font-semibold tabular-nums">{formatUsd(t.monthlyUsd)}/mo</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}
