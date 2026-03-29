import { useWeb3 } from "@/contexts/Web3Context";
import { useCompliance } from "@/contexts/ComplianceContext";
import { ComplianceStatusPill } from "./ComplianceStatusPill";
import { COUNTRY_JURISDICTION_LEVEL } from "@/compliance/jurisdictionPolicyConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COUNTRIES = Object.keys(COUNTRY_JURISDICTION_LEVEL)
  .filter((k) => k !== "UNKNOWN")
  .sort();

function levelAccent(level: string): string {
  if (level === "blocked") return "border-red-500/40 bg-red-500/10";
  if (level === "restricted") return "border-amber-500/40 bg-amber-500/10";
  if (level === "warning") return "border-amber-500/30 bg-amber-500/5";
  if (level === "unknown") return "border-border bg-muted/20";
  return "border-emerald-500/25 bg-emerald-500/5";
}

export function JurisdictionBanner() {
  const { address } = useWeb3();
  const {
    countryCode,
    setCountryCode,
    tier,
    setTier,
    profile,
    jurisdictionLevel,
    jurisdictionDescription,
    annualAttestationFresh,
    recordAnnualAttestation,
    disputeBlocksUx,
    setDisputeBlocksUx,
    maintenanceLabel,
    setMaintenanceLabel,
  } = useCompliance();

  return (
    <div
      className={cn(
        "border-b px-4 py-3 text-sm",
        levelAccent(jurisdictionLevel)
      )}
    >
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Compliance</span>
          <ComplianceStatusPill rwaClass={profile.rwaClass} />
          <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
          <span className="text-xs text-muted-foreground leading-snug">{jurisdictionDescription}</span>
        </div>

        <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Declared jurisdiction</Label>
            <Select value={countryCode} onValueChange={(v) => setCountryCode(v)}>
              <SelectTrigger className="h-8 w-[220px] rounded-lg text-xs bg-background/80">
                <SelectValue placeholder="Select country (declared only — no on-chain geo)" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__UNKNOWN__">Undeclared / prefer not to say</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Path</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
              <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail (permissionless)</SelectItem>
                <SelectItem value="verified">Verified (future)</SelectItem>
                <SelectItem value="institutional">Institutional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Demo: dispute</Label>
            <Button
              type="button"
              variant={disputeBlocksUx ? "destructive" : "outline"}
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={() => setDisputeBlocksUx(!disputeBlocksUx)}
            >
              {disputeBlocksUx ? "Under review (on)" : "Simulate under review"}
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Demo: maintenance</Label>
            <Select value={maintenanceLabel} onValueChange={(v) => setMaintenanceLabel(v as typeof maintenanceLabel)}>
              <SelectTrigger className="h-8 w-[180px] rounded-lg text-xs bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="planned_maintenance">Planned maintenance</SelectItem>
                <SelectItem value="grace_period">Grace period</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="haircut">Haircut</SelectItem>
                <SelectItem value="liquidation_eligible">Liquidation eligible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {address && !annualAttestationFresh && (
        <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Annual risk attestation recommended — confirms you control hardware, accept liquidation risk, and understand
            jurisdictional limits.
          </p>
          <Button type="button" size="sm" variant="secondary" className="rounded-full text-xs" onClick={recordAnnualAttestation}>
            Record attestation (this device)
          </Button>
        </div>
      )}
    </div>
  );
}
