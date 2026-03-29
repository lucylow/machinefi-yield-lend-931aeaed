import { BNB_STACK } from "@/constants/chainMeta";
import { cn } from "@/lib/utils";

export function ArchitectureStrip({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 text-center">
        Settlement & proof architecture
      </p>
      <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:divide-x md:divide-border/60 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
        {BNB_STACK.map((layer) => (
          <div key={layer.id} className={cn("flex-1 p-4 md:p-5 bg-gradient-to-br", layer.accent)}>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">{layer.name}</p>
            <p className="text-sm text-foreground font-medium leading-snug">{layer.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
