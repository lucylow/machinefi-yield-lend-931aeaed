import type { HardwareDevice } from "@/hooks/useHardwareNFT";
import { cn } from "@/lib/utils";

const DEFAULT_MILESTONES = [
  { id: "reg", label: "Registered", detail: "On-chain device record" },
  { id: "proof", label: "Proof submitted", detail: "Greenfield / opBNB attestation" },
  { id: "verify", label: "Verification", detail: "Oracle + policy checks" },
  { id: "yield", label: "Yield mark", detail: "Collateral factor applied" },
] as const;

export function DeviceLifecycleTimeline({ devices }: { devices: HardwareDevice[] }) {
  const active = devices.filter((d) => d.isActive).length;
  return (
    <div className="glass-card p-6 md:p-8" style={{ borderRadius: "1.25rem" }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">Lifecycle</p>
      <h3 className="text-lg font-semibold font-display text-foreground mb-6">Device pipeline</h3>
      <ol className="relative space-y-0">
        {DEFAULT_MILESTONES.map((m, i) => (
          <li key={m.id} className="flex gap-4 pb-8 last:pb-0 relative">
            {i < DEFAULT_MILESTONES.length - 1 && (
              <div
                className="absolute left-[13px] top-8 bottom-0 w-px bg-gradient-to-b from-primary/40 to-transparent"
                aria-hidden
              />
            )}
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                "border-primary/50 bg-primary/10 text-primary"
              )}
              aria-hidden
            >
              {i + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/60">
        {devices.length === 0
          ? "No devices in your wallet view yet. Registration creates the first milestone."
          : `${active} active / ${devices.length} total in this session.`}
      </p>
    </div>
  );
}
