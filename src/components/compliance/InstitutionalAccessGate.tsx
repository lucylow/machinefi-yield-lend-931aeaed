import type { ReactNode } from "react";
import { useCompliance } from "@/contexts/ComplianceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function InstitutionalAccessGate({ children }: { children: ReactNode }) {
  const { tier, setTier, gateFor, refreshComplianceSnapshot } = useCompliance();
  const gate = gateFor("institutional_pool");

  if (tier !== "institutional") {
    return <>{children}</>;
  }

  if (!gate.allowed) {
    return (
      <Card className="border-border/60 max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-base font-display">Institutional access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{gate.message}</p>
          {gate.recoveryHint && <p className="text-xs">{gate.recoveryHint}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setTier("retail")}>
              Use retail path
            </Button>
            <Button type="button" variant="secondary" className="rounded-full" onClick={() => void refreshComplianceSnapshot()}>
              Refresh verification status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
