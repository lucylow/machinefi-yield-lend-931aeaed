import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DemoScenarioId } from "@/simulation/scenarios";

type DataMode = "onchain" | "demo_fallback";

interface AppState {
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  /** Prefer opBNB for proofs / activity messaging (UI only until wired). */
  opBnbPreferred: boolean;
  setOpBnbPreferred: (v: boolean) => void;
  dataMode: DataMode;
  setDataMode: (m: DataMode) => void;
  /** Preset shadow-protocol book for demos (simulation engine). */
  demoScenario: DemoScenarioId;
  setDemoScenario: (id: DemoScenarioId) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      rightPanelOpen: true,
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      opBnbPreferred: false,
      setOpBnbPreferred: (v) => set({ opBnbPreferred: v }),
      dataMode: "demo_fallback",
      setDataMode: (m) => set({ dataMode: m }),
      demoScenario: "healthy",
      setDemoScenario: (id) => set({ demoScenario: id }),
    }),
    {
      name: "machinefi-app",
      partialize: (s) => ({
        opBnbPreferred: s.opBnbPreferred,
        dataMode: s.dataMode,
        rightPanelOpen: s.rightPanelOpen,
        demoScenario: s.demoScenario,
      }),
    }
  )
);
