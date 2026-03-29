import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent inner width for app routes (navbar is global). */
export function AppPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-7xl mx-auto w-full", className)}>
      {children}
    </div>
  );
}
