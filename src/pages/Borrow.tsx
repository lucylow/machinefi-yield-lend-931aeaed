import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useWeb3 } from '@/contexts/Web3Context';
import { useHardwareNFT, type HardwareDevice } from '@/hooks/useHardwareNFT';
import { useProtocolSimulationOptional } from '@/contexts/ProtocolSimulationContext';
import { getLoadErrorMessage } from '@/lib/errors';
import { motion } from 'framer-motion';
import DepositHardware from '@/components/dapp/DepositHardware';
import RepayPanel from '@/components/dapp/RepayPanel';
import LiquidatePanel from '@/components/dapp/LiquidatePanel';
import DappLoanCalculator from '@/components/dapp/DappLoanCalculator';
import YieldPredictionPanel from '@/components/dapp/YieldPredictionPanel';
import LoanPoolMatcher from '@/components/dapp/LoanPoolMatcher';
import { useCompliance } from '@/contexts/ComplianceContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InstitutionalAccessGate } from '@/components/compliance/InstitutionalAccessGate';
import { BNBStackStrip } from '@/components/dapp/BNBStackStrip';

export interface AiLoanDefaults {
  monthlyYield: number;
  ltv: number;
  interestRate: number;
}

export interface LoanCalcValues {
  collateral: number;
  loan: number;
}

const Borrow = () => {
  const { isConnected, connectWallet } = useWeb3();
  const { gateFor } = useCompliance();
  const borrowGate = gateFor('borrow');
  const { getUserDevices } = useHardwareNFT();
  const sim = useProtocolSimulationOptional();
  const isDemoMode = sim?.isDemoSimulation ?? true;
  const [myNFTs, setMyNFTs] = useState<HardwareDevice[]>([]);
  const [aiDefaults, setAiDefaults] = useState<AiLoanDefaults | null>(null);
  const [selectedDevice, setSelectedDevice] = useState('helium');
  const [loanCalcValues, setLoanCalcValues] = useState<LoanCalcValues>({ collateral: 540, loan: 351 });
  const [aiRiskScore, setAiRiskScore] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isConnected && !isDemoMode) return;
    let cancelled = false;
    getUserDevices()
      .then((list) => {
        if (!cancelled) setMyNFTs(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setMyNFTs([]);
          toast.error(getLoadErrorMessage(err, 'Could not load your devices.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, isDemoMode, getUserDevices]);

  const handlePrediction = (defaults: AiLoanDefaults) => {
    setAiDefaults(defaults);
    // Extract risk score from the AI prediction for pool matching
    setAiRiskScore(undefined); // will be populated from prediction panel
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-7xl mx-auto w-full">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold gradient-text mb-8"
        >
          Borrow Against Your Hardware
        </motion.h1>

        {!isConnected && !isDemoMode ? (
          <div className="glass-card p-12 text-center" style={{ borderRadius: '2rem' }}>
            <p className="text-2xl mb-2">🔗</p>
            <p className="text-muted-foreground mb-4">Connect your wallet to start borrowing.</p>
            <button onClick={connectWallet} className="btn-gradient px-8 py-3 rounded-full font-semibold text-primary-foreground">
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-2">
              <BNBStackStrip />
            </div>
            {!borrowGate.allowed && borrowGate.mode === 'blocked' && (
              <Alert variant="destructive" className="lg:col-span-2 border-red-500/50">
                <AlertTitle className="text-sm font-display">Borrowing blocked by policy</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p>{borrowGate.message}</p>
                  {borrowGate.recoveryHint && <p className="text-muted-foreground">{borrowGate.recoveryHint}</p>}
                </AlertDescription>
              </Alert>
            )}
            {borrowGate.mode === 'warn' && borrowGate.message && borrowGate.allowed && (
              <Alert className="lg:col-span-2 border-amber-500/40 bg-amber-500/10">
                <AlertTitle className="text-sm text-amber-100">Jurisdiction notice</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">{borrowGate.message}</AlertDescription>
              </Alert>
            )}
            <YieldPredictionPanel
              onPrediction={handlePrediction}
              onDeviceChange={setSelectedDevice}
              onRiskScore={setAiRiskScore}
            />
            <DepositHardware hardwareNFTs={myNFTs} />
            <DappLoanCalculator aiDefaults={aiDefaults} onCalcChange={setLoanCalcValues} />
            <InstitutionalAccessGate>
              <LoanPoolMatcher
                deviceType={selectedDevice}
                collateralValueUsd={loanCalcValues.collateral}
                desiredLoanUsd={loanCalcValues.loan}
                riskScore={aiRiskScore}
              />
            </InstitutionalAccessGate>
            <RepayPanel />
            <LiquidatePanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default Borrow;
