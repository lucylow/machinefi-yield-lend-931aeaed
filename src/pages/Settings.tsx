import { PageHeader } from "@/components/layout/PageHeader";
import { AppPage } from "@/components/layout/AppPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/appStore";
import { useWeb3 } from "@/contexts/Web3Context";
import { EXPECTED_CHAIN_ID } from "@/constants/addresses";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_SCENARIOS, type DemoScenarioId } from "@/simulation/scenarios";

const SettingsPage = () => {
  const {
    opBnbPreferred,
    setOpBnbPreferred,
    dataMode,
    setDataMode,
    rightPanelOpen,
    setRightPanelOpen,
    demoScenario,
    setDemoScenario,
  } = useAppStore();
  const { address, isConnected, walletConnectAvailable, disconnectWallet } = useWeb3();

  return (
    <AppPage>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Data sources, layout, and BNB stack preferences. These controls are client-side until tied to your account API."
      />

      <div className="grid gap-6 max-w-2xl">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-display">Data & fallbacks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm">On-chain primary mode</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When off, the UI labels aggregates as demo / fallback and avoids silent empty states.
                </p>
              </div>
              <Switch
                checked={dataMode === "onchain"}
                onCheckedChange={(on) => setDataMode(on ? "onchain" : "demo_fallback")}
              />
            </div>
            <Separator className="bg-border/60" />
            <div className="space-y-2">
              <Label className="text-sm">Demo scenario (simulation)</Label>
              <p className="text-xs text-muted-foreground">
                Switches the shadow protocol book: health factors, stale proofs, and liquidation stories update instantly.
              </p>
              <Select value={demoScenario} onValueChange={(v) => setDemoScenario(v as DemoScenarioId)}>
                <SelectTrigger className="rounded-lg max-w-md">
                  <SelectValue placeholder="Scenario" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEMO_SCENARIOS) as DemoScenarioId[]).map((id) => (
                    <SelectItem key={id} value={id}>
                      {DEMO_SCENARIOS[id].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator className="bg-border/60" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Env overrides: <span className="font-mono text-foreground">VITE_USE_MOCK_DATA</span>,{" "}
              <span className="font-mono text-foreground">VITE_FORCE_OFFLINE_MODE</span>,{" "}
              <span className="font-mono text-foreground">VITE_MOCK_VOLATILITY_LEVEL</span> (low|medium|high),{" "}
              <span className="font-mono text-foreground">VITE_MOCK_DEVICE_COUNT</span>,{" "}
              <span className="font-mono text-foreground">VITE_MOCK_SEED</span>,{" "}
              <span className="font-mono text-foreground">VITE_MOCK_TICK_MS</span>.
            </p>
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm">Show right summary panel</Label>
                <p className="text-xs text-muted-foreground mt-1">Desktop layout only (xl breakpoint).</p>
              </div>
              <Switch checked={rightPanelOpen} onCheckedChange={setRightPanelOpen} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-display">BNB stack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm">Prefer opBNB messaging</Label>
                <p className="text-xs text-muted-foreground mt-1">Highlights proof and activity rail in copy (UI only).</p>
              </div>
              <Switch checked={opBnbPreferred} onCheckedChange={setOpBnbPreferred} />
            </div>
            <p className="text-xs text-muted-foreground">
              Target chain id: <span className="font-mono text-foreground">{EXPECTED_CHAIN_ID}</span> · Gas shown in BNB in the top bar.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-display">Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              WalletConnect:{" "}
              <span className="text-foreground font-medium">{walletConnectAvailable ? "project id configured" : "set VITE_WALLETCONNECT_PROJECT_ID"}</span>
            </p>
            {isConnected && address && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md">
                  {address.slice(0, 8)}…{address.slice(-6)}
                </span>
                <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => disconnectWallet()}>
                  Disconnect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
};

export default SettingsPage;
