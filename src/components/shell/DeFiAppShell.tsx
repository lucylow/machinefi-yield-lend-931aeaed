import { cn } from "@/lib/utils";
import { DeFiSidebar } from "@/components/shell/DeFiSidebar";
import { DeFiTopBar } from "@/components/shell/DeFiTopBar";
import { DeFiRightPanel } from "@/components/shell/DeFiRightPanel";
import { useAppStore } from "@/store/appStore";
import { JurisdictionBanner } from "@/components/compliance/JurisdictionBanner";
import { MaintenanceNoticeCard } from "@/components/compliance/MaintenanceNoticeCard";
import { useComplianceOptional } from "@/contexts/ComplianceContext";
import { WarningBanner } from "@/components/defi/WarningBanner";
import { useWeb3 } from "@/contexts/Web3Context";

export function DeFiAppShell({ children }: { children: React.ReactNode }) {
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const compliance = useComplianceOptional();
  const { connectionError } = useWeb3();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="hidden lg:flex">
        <DeFiSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <DeFiTopBar />
        {compliance && (
          <div className="shrink-0 border-b border-border/60 bg-background/90">
            <JurisdictionBanner />
            <div className="max-w-[1600px] mx-auto w-full px-4 py-2">
              <MaintenanceNoticeCard label={compliance.maintenanceLabel} />
            </div>
          </div>
        )}
        <div className="flex flex-1 min-h-0">
          <main
            id="main-content"
            className={cn("flex-1 overflow-y-auto min-w-0", "scrollbar-thin")}
          >
            <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
              {connectionError && (
                <WarningBanner severity="warning" title="Wallet connection">
                  {connectionError}
                </WarningBanner>
              )}
              {children}
            </div>
          </main>
          {rightPanelOpen && <DeFiRightPanel />}
        </div>
      </div>
    </div>
  );
}
