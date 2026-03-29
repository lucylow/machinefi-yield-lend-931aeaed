import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8", className)}>
      <div className="space-y-2 min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/90">{eyebrow}</p>
        )}
        <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions ? <div className="shrink-0 flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
