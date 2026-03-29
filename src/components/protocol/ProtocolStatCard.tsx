import { cn } from "@/lib/utils";

interface ProtocolStatCardProps {
  label: string;
  value: string;
  hint?: string;
  variant?: "default" | "accent" | "warning";
  className?: string;
}

export function ProtocolStatCard({ label, value, hint, variant = "default", className }: ProtocolStatCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-5 md:p-6 text-left transition-[transform,box-shadow] duration-300 motion-reduce:transform-none",
        variant === "accent" && "ring-1 ring-primary/25 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.35)]",
        variant === "warning" && "ring-1 ring-amber-500/30",
        className
      )}
      style={{ borderRadius: "1.25rem" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <p className="stat-number text-2xl md:text-3xl tabular-nums leading-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-2 leading-snug">{hint}</p> : null}
    </div>
  );
}
