import { Card, CardContent } from "@/components/ui/card";
import type { MaintenanceOperationalLabel } from "@/compliance/types";
import { Wrench, AlertTriangle, Timer } from "lucide-react";

const COPY: Record<
  MaintenanceOperationalLabel,
  { title: string; body: string; icon: typeof Wrench }
> = {
  normal: {
    title: "Operations normal",
    body: "Proof cadence is healthy. Keep maintaining your hardware off-chain.",
    icon: Wrench,
  },
  planned_maintenance: {
    title: "Planned maintenance",
    body: "You indicated planned downtime — keep proofs updated when you are back online.",
    icon: Timer,
  },
  grace_period: {
    title: "Grace period",
    body: "The protocol is giving short leniency; refresh proofs soon to avoid haircuts or liquidation eligibility.",
    icon: Timer,
  },
  degraded: {
    title: "Degraded performance",
    body: "Uptime or proofs are below target. Refresh proof bundles and check device health.",
    icon: AlertTriangle,
  },
  haircut: {
    title: "Haircut applied",
    body: "Repeated proof misses reduced borrow power. Recover by restoring stable proofs.",
    icon: AlertTriangle,
  },
  liquidation_eligible: {
    title: "Liquidation eligible",
    body: "Extended downtime or risk policy may block new credit until the position is repaired or closed.",
    icon: AlertTriangle,
  },
};

export function MaintenanceNoticeCard({ label }: { label: MaintenanceOperationalLabel }) {
  const row = COPY[label];
  const Icon = row.icon;
  if (label === "normal") return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="pt-4 flex gap-3 items-start">
        <Icon className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{row.body}</p>
        </div>
      </CardContent>
    </Card>
  );
}
