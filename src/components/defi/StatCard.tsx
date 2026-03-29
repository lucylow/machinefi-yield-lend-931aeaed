import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, trend = "neutral", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm px-4 py-3.5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />}
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground",
          trend === "up" && "text-emerald-400",
          trend === "down" && "text-rose-400"
        )}
      >
        {value}
      </p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
