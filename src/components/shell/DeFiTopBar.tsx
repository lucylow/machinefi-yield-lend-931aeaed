import { Link } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Copy, Menu, PanelRight, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { EXPECTED_CHAIN_ID } from "@/constants/addresses";
import { useAppStore } from "@/store/appStore";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DeFiSidebar } from "@/components/shell/DeFiSidebar";
import { useState } from "react";
import { DemoModeBadge } from "@/components/demo/DemoModeBadge";

function chainLabel(chainId: number): string {
  if (chainId === 97) return "BNB Testnet";
  if (chainId === 56) return "BNB Chain";
  return `Chain ${chainId}`;
}

export function DeFiTopBar() {
  const {
    address,
    isConnected,
    isCorrectNetwork,
    connectWallet,
    connectWalletConnect,
    disconnectWallet,
    switchNetwork,
    provider,
    connectionError,
    walletConnectAvailable,
  } = useWeb3();
  const { rightPanelOpen, toggleRightPanel, opBnbPreferred, setOpBnbPreferred } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const gasHint = isConnected && isCorrectNetwork ? "~0.0002 BNB" : "—";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 backdrop-blur-md px-2 sm:px-4">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px] border-border bg-[hsl(200_50%_5%)]">
          <DeFiSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />
        <span className="truncate">
          Fast confirmations on BNB Chain · low gas vs L1
          {opBnbPreferred && " · opBNB preferred for proofs"}
        </span>
      </div>

      <div className="flex-1" />

      <DemoModeBadge className="mr-1 sm:mr-2" />

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-2 mr-2 px-2 py-1 rounded-lg border border-border/60 bg-card/50">
          <Switch id="opbnb-ui" checked={opBnbPreferred} onCheckedChange={setOpBnbPreferred} />
          <Label htmlFor="opbnb-ui" className="text-[10px] uppercase tracking-wide text-muted-foreground cursor-pointer">
            opBNB
          </Label>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex text-muted-foreground"
          aria-label="Toggle summary panel"
          onClick={toggleRightPanel}
        >
          <PanelRight className={rightPanelOpen ? "h-5 w-5 text-primary" : "h-5 w-5"} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 border-border bg-card">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Protocol signals</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs flex flex-col items-start gap-1 cursor-default focus:bg-muted/50">
              <span className="text-foreground font-medium">Oracle heartbeat OK</span>
              <span className="text-muted-foreground">BSC finalized · feeds within SLA</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/analytics" className="text-xs text-primary">
                Open analytics
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden sm:flex flex-col items-end text-[10px] leading-tight text-muted-foreground px-2 border-l border-border/50">
          <span className="uppercase tracking-wide">Gas (est.)</span>
          <span className="font-mono text-foreground">{gasHint}</span>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-1">
            {!isCorrectNetwork && (
              <Button type="button" size="sm" variant="destructive" className="h-8 text-xs rounded-lg" onClick={() => switchNetwork()}>
                Switch to {chainLabel(EXPECTED_CHAIN_ID)}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg border-primary/35 font-mono text-xs tabular-nums gap-2"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {short}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-border bg-card">
                <DropdownMenuLabel className="font-mono text-xs break-all">{address}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copy} className="gap-2">
                  <Copy className="h-4 w-4" /> Copy address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => disconnectWallet()} className="text-destructive focus:text-destructive">
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="h-9 rounded-lg btn-gradient text-primary-foreground border-0">
                Connect
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-border bg-card">
              <DropdownMenuItem onClick={() => connectWallet()}>MetaMask / Injected</DropdownMenuItem>
              <DropdownMenuItem
                disabled={!walletConnectAvailable}
                onClick={() => connectWalletConnect()}
                title={!walletConnectAvailable ? "Set VITE_WALLETCONNECT_PROJECT_ID" : undefined}
              >
                WalletConnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {connectionError && (
        <span className="sr-only" role="status">
          {connectionError}
        </span>
      )}
    </header>
  );
}
