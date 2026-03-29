import { useState, useEffect, useMemo } from 'react';
import type { AiLoanDefaults, LoanCalcValues } from '@/pages/Borrow';

interface Props {
  aiDefaults?: AiLoanDefaults | null;
  onCalcChange?: (values: LoanCalcValues) => void;
}

const DappLoanCalculator = ({ aiDefaults, onCalcChange }: Props) => {
  const [monthlyYield, setMonthlyYield] = useState(45);
  const [ltv, setLtv] = useState(65);
  const [months, setMonths] = useState(12);
  const [interestRate, setInterestRate] = useState(8);
  const [aiApplied, setAiApplied] = useState(false);

  useEffect(() => {
    if (aiDefaults) {
      setMonthlyYield(Math.round(aiDefaults.monthlyYield * 100) / 100);
      setLtv(Math.round(aiDefaults.ltv));
      setInterestRate(Math.round(aiDefaults.interestRate * 10) / 10);
      setAiApplied(true);
      const timer = setTimeout(() => setAiApplied(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [aiDefaults]);

  const calc = useMemo(() => {
    const collateral = monthlyYield * months;
    const loan = collateral * (ltv / 100);
    const interest = loan * (interestRate / 100) * (months / 12);
    const monthly = months > 0 ? (loan + interest) / months : 0;
    return { collateral, loan, interest, monthly };
  }, [monthlyYield, ltv, months, interestRate]);

  useEffect(() => {
    onCalcChange?.({ collateral: calc.collateral, loan: calc.loan });
  }, [calc.collateral, calc.loan, onCalcChange]);

  return (
    <div className="glass-card p-6" style={{ borderRadius: '1.5rem' }}>
      {aiApplied && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium animate-in fade-in duration-300">
          🤖 AI-recommended values applied
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-5">📊 Loan Calculator</h3>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Monthly Yield (USD)</label>
          <input
            type="number"
            value={monthlyYield}
            onChange={(e) => setMonthlyYield(Number(e.target.value))}
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Loan-to-Value: {ltv}%</label>
          <input type="range" min={20} max={80} value={ltv} onChange={(e) => setLtv(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Duration: {months} months</label>
          <input type="range" min={3} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full accent-primary" />
        </div>

        <div className="glass-card p-5 space-y-2 text-sm" style={{ borderRadius: '1rem' }}>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Collateral Value</span>
            <span className="font-semibold text-foreground">${calc.collateral.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan Amount</span>
            <span className="font-semibold text-primary">${calc.loan.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Interest ({interestRate}% APR)</span>
            <span className="font-semibold text-foreground">${calc.interest.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Payment</span>
            <span className="font-semibold text-foreground">${calc.monthly.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DappLoanCalculator;
