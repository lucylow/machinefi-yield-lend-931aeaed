import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-0 text-sm",
        className
      )}
    >
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right tabular-nums break-all">{value}</span>
    </div>
  );
}
