import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "@/contexts/Web3Context";
import { ProtocolSimulationProvider } from "@/contexts/ProtocolSimulationContext";
import { ComplianceProvider } from "@/contexts/ComplianceContext";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Borrow from "./pages/Borrow.tsx";
import HardwareManager from "./pages/HardwareManager.tsx";
import DAOCodePage from "./pages/DAO.tsx";
import NotFound from "./pages/NotFound.tsx";
import Layout from "./components/Layout/Layout.tsx";
import Governance from "./pages/Governance.tsx";
import HardwareRegister from "./pages/HardwareRegister.tsx";
import HardwareProof from "./pages/HardwareProof.tsx";
import BorrowFlow from "./pages/BorrowFlow.tsx";
import RiskDashboard from "./pages/RiskDashboard.tsx";
import LiquidationDashboard from "./pages/LiquidationDashboard.tsx";
import ProtocolRevenue from "./pages/ProtocolRevenue.tsx";
import Tokenomics from "./pages/Tokenomics.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import Positions from "./pages/Positions.tsx";
import PositionDetail from "./pages/PositionDetail.tsx";
import RepayPage from "./pages/Repay.tsx";
import LendPage from "./pages/Lend.tsx";
import AnalyticsPage from "./pages/Analytics.tsx";
import SettingsPage from "./pages/Settings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Web3Provider>
          <ProtocolSimulationProvider>
          <ComplianceProvider>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/positions" element={<Positions />} />
              <Route path="/positions/:nftId" element={<PositionDetail />} />
              <Route path="/borrow" element={<Borrow />} />
              <Route path="/borrow/:type/:id" element={<BorrowFlow />} />
              <Route path="/repay" element={<RepayPage />} />
              <Route path="/lend" element={<LendPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/devices" element={<HardwareManager />} />
              <Route path="/hardware" element={<HardwareManager />} />
              <Route path="/hardware/register" element={<HardwareRegister />} />
              <Route path="/hardware/proof/:id" element={<HardwareProof />} />
              <Route path="/governance" element={<Governance />} />
              <Route path="/protocol/revenue" element={<ProtocolRevenue />} />
              <Route path="/protocol/tokenomics" element={<Tokenomics />} />
              <Route path="/risk" element={<RiskDashboard />} />
              <Route path="/liquidations" element={<LiquidationDashboard />} />
              <Route path="/dao" element={<DAOCodePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          </ComplianceProvider>
          </ProtocolSimulationProvider>
        </Web3Provider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
