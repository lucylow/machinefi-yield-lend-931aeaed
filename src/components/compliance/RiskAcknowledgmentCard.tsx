import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listDisclosures } from "@/compliance/disclosureCatalog";
import { Label } from "@/components/ui/label";

interface RiskAcknowledgmentCardProps {
  disclosureIds: string[];
  onAcknowledge: () => void;
  submitLabel?: string;
}

export function RiskAcknowledgmentCard({ disclosureIds, onAcknowledge, submitLabel }: RiskAcknowledgmentCardProps) {
  const disclosures = listDisclosures(disclosureIds);
  const [checked, setChecked] = useState(false);

  return (
    <Card className="border-amber-500/35 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display text-amber-100">Risk disclosures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {disclosures.map((d) => (
          <div key={d.type} className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">{d.title}</p>
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
              {d.bullets.map((b, i) => (
                <li key={`${d.type}-${i}`}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex items-start gap-2">
          <Checkbox id="risk-ack" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
          <Label htmlFor="risk-ack" className="text-xs text-muted-foreground leading-snug cursor-pointer">
            I have read the above, understand this is not legal or tax advice, and I accept the operational and market risks
            for this action.
          </Label>
        </div>
        <Button
          type="button"
          className="w-full rounded-full btn-gradient text-primary-foreground border-0"
          disabled={!checked}
          onClick={onAcknowledge}
        >
          {submitLabel ?? "Acknowledge and continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
