import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContentGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function ContentGrid({ children, columns = 2, className }: ContentGridProps) {
  const cols =
    columns === 3
      ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      : columns === 2
        ? "grid-cols-1 lg:grid-cols-2"
        : "grid-cols-1";
  return <div className={cn("grid gap-6 lg:gap-8", cols, className)}>{children}</div>;
}
