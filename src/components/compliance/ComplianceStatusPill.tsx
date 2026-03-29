import { cn } from "@/lib/utils";
import type { RwaClassification } from "@/compliance/types";

const LABELS: Record<RwaClassification, string> = {
  unclassified: "Unclassified",
  retail_eligible: "Retail",
  verified_eligible: "Verified",
  institutional_eligible: "Institutional",
  jurisdiction_restricted: "Region restricted",
  feature_limited: "Feature limited",
  compliance_blocked: "Blocked",
};

const STYLES: Record<RwaClassification, string> = {
  unclassified: "bg-muted text-muted-foreground border-border",
  retail_eligible: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
  verified_eligible: "bg-sky-500/15 text-sky-200 border-sky-500/40",
  institutional_eligible: "bg-violet-500/15 text-violet-200 border-violet-500/40",
  jurisdiction_restricted: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  feature_limited: "bg-amber-500/15 text-amber-100 border-amber-500/30",
  compliance_blocked: "bg-red-500/15 text-red-200 border-red-500/40",
};

export function ComplianceStatusPill({ rwaClass }: { rwaClass: RwaClassification }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums",
        STYLES[rwaClass]
      )}
    >
      {LABELS[rwaClass]}
    </span>
  );
}
