import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="text-lg font-semibold font-display text-foreground tracking-tight">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
    </div>
  );
}
