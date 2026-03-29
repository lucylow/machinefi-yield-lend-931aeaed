import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateCardProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyStateCard({ title, description, action, icon, className }: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-10 text-center border-dashed border-border/80",
        className
      )}
      style={{ borderRadius: "1.5rem" }}
      role="status"
    >
      {icon ? <div className="text-3xl mb-3" aria-hidden>{icon}</div> : null}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">{description}</p>
      {action}
    </div>
  );
}
