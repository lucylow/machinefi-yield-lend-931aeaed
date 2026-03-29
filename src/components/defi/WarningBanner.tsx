import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type WarningSeverity = "info" | "warning" | "critical";

export interface WarningBannerProps {
  severity: WarningSeverity;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

const styles: Record<WarningSeverity, string> = {
  info: "border-cyan-500/35 bg-cyan-500/10 text-cyan-100",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  critical: "border-rose-500/45 bg-rose-500/10 text-rose-100",
};

const Icon: Record<WarningSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

export function WarningBanner({ severity, title, children, className }: WarningBannerProps) {
  const I = Icon[severity];
  return (
    <div
      role="status"
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles[severity], className)}
    >
      <I className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold leading-tight">{title}</p>
        {children && <div className="text-xs opacity-90 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
