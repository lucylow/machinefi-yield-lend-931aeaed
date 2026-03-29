import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Layers,
  Cpu,
  ArrowDownLeft,
  Wallet,
  Landmark,
  BarChart3,
  Vote,
  Settings,
  ShieldAlert,
  Gavel,
  Coins,
} from "lucide-react";

export type DeFiNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  section: "operate" | "liquidity" | "system";
};

export const DEFI_NAV: DeFiNavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "operate" },
  { to: "/positions", label: "My positions", icon: Layers, section: "operate" },
  { to: "/devices", label: "Devices", icon: Cpu, section: "operate" },
  { to: "/borrow", label: "Borrow", icon: ArrowDownLeft, section: "operate" },
  { to: "/repay", label: "Repay", icon: Wallet, section: "operate" },
  { to: "/lend", label: "Lend / supply", icon: Landmark, section: "liquidity" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, section: "system" },
  { to: "/risk", label: "Risk", icon: ShieldAlert, section: "system" },
  { to: "/liquidations", label: "Liquidations", icon: Gavel, section: "system" },
  { to: "/protocol/tokenomics", label: "Tokenomics", icon: Coins, section: "system" },
  { to: "/governance", label: "Governance", icon: Vote, section: "system" },
  { to: "/settings", label: "Settings", icon: Settings, section: "system" },
];

export function isDAppPath(pathname: string): boolean {
  return pathname !== "/";
}
