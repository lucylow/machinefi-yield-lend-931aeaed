import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProtocolThesisCard() {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">Protocol thesis</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
        <p>Productive machines generate measurable value. Verified usage turns activity into yield you can size on-chain.</p>
        <p>That yield backs borrowing: stablecoin liquidity against conservative haircuts, with liquidation protecting lenders.</p>
      </CardContent>
    </Card>
  );
}

export function ProtocolRiskCard() {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">Risk boundaries</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
        <p>Unverified devices do not contribute collateral. Stale proofs reduce marks until refreshed.</p>
        <p>LTV is monitored continuously. Liquidation is an expected protocol safeguard, not an edge case.</p>
      </CardContent>
    </Card>
  );
}

export function BnbChainNarrativeCard() {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">BNB Chain stack</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
        <p>
          <strong className="text-foreground font-medium">BSC</strong> settles positions and pool accounting.
        </p>
        <p>
          <strong className="text-foreground font-medium">opBNB</strong> carries high-frequency yield and proof cadence off the hot path.
        </p>
        <p>
          <strong className="text-foreground font-medium">Greenfield</strong> stores evidence bundles with tamper-evident references.
        </p>
      </CardContent>
    </Card>
  );
}
