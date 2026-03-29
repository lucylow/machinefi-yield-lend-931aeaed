import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DEFI_NAV } from "@/constants/defiNav";
import { Microchip } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const sections: { id: typeof DEFI_NAV[number]["section"]; label: string }[] = [
  { id: "operate", label: "Operate" },
  { id: "liquidity", label: "Liquidity" },
  { id: "system", label: "System" },
];

export function DeFiSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-border/80 bg-[hsl(200_50%_5%/0.95)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-border/60">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onNavigate}
        >
          <Microchip className="h-6 w-6 text-primary shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-foreground truncate">MachineFi</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Yield lend</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6" aria-label="App">
        {sections.map((sec) => {
          const items = DEFI_NAV.filter((i) => i.section === sec.id);
          if (items.length === 0) return null;
          return (
            <div key={sec.id}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/90">
                {sec.label}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <Separator className="bg-border/60" />
      <div className="p-3 text-[10px] text-muted-foreground leading-relaxed">
        <span className="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-primary mb-1">
          BNB Chain
        </span>
        <p className="mt-2">Settlement on BSC · proofs on opBNB / Greenfield.</p>
      </div>
    </aside>
  );
}
