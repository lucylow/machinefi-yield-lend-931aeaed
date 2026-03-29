import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  bsc: "BSC",
  opbnb: "opBNB",
  greenfield: "Greenfield",
};

export function ChainBadge({ chain, className }: { chain: keyof typeof LABELS | string; className?: string }) {
  const text = LABELS[chain] ?? chain.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground",
        className
      )}
    >
      {text}
    </span>
  );
}
