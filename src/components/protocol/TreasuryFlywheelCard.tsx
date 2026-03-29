import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/protocol/InfoRow";
import { formatBpsAsPercent, formatUsd } from "@/lib/format";
import type { TreasuryHealthSnapshot } from "@/types/protocol";
import { RefreshCw } from "lucide-react";

interface TreasuryFlywheelCardProps {
  snapshot: TreasuryHealthSnapshot;
}

export function TreasuryFlywheelCard({ snapshot }: TreasuryFlywheelCardProps) {
  return (
    <Card className="border-primary/25 bg-gradient-to-br from-card/95 to-primary/5 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary shrink-0" aria-hidden />
          Treasury flywheel
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
          Operators borrow against future yield → fees fund reserves → lower risk premia → more borrow demand → sustainable fee revenue.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <InfoRow label="Fees earned (24h)" value={formatUsd(snapshot.feesEarnedTodayUsd)} />
        <InfoRow label="Fees earned (30d)" value={formatUsd(snapshot.feesEarned30dUsd)} />
        <InfoRow label="Reserve health" value={formatBpsAsPercent(snapshot.reserveRatioBps, 1)} />
        <InfoRow label="Idle stable (treasury + POL)" value={formatUsd(snapshot.idleStableUsd, { compact: true })} />
        <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">{snapshot.narrative}</p>
      </CardContent>
    </Card>
  );
}
