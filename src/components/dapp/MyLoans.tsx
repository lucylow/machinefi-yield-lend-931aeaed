import { motion } from 'framer-motion';
import type { LoanPosition } from '@/hooks/useLendingPool';

interface Props {
  loans: LoanPosition[];
  onRepay: (nftId: number) => void;
}

const MyLoans = ({ loans, onRepay }: Props) => (
  <div>
    <h3 className="text-lg font-semibold text-foreground mb-4">💳 My Loans</h3>
    {loans.length === 0 ? (
      <div className="glass-card p-8 text-center" style={{ borderRadius: '1.5rem' }}>
        <p className="text-muted-foreground">No active loans. Deposit hardware to borrow.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {loans.map((loan, i) => (
          <motion.div
            key={loan.nftId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5"
            style={{ borderRadius: '1rem' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground text-sm">{loan.deviceType}</p>
                <p className="text-xs text-muted-foreground">NFT #{loan.nftId}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${loan.status === 'active' ? 'bg-primary/10 text-primary' : loan.status === 'repaid' ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                {loan.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Debt</p>
                <p className="font-semibold text-foreground">${loan.debt}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Collateral</p>
                <p className="font-semibold text-foreground">${loan.collateralValue}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">LTV</p>
                <p className="font-semibold text-foreground">{loan.ltv}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Yield Locked</p>
                <p className="font-semibold text-foreground">{loan.yieldPercentage}%</p>
              </div>
            </div>
            {loan.status === 'active' && (
              <button
                onClick={() => onRepay(loan.nftId)}
                className="mt-4 w-full btn-gradient py-2 rounded-full text-sm font-semibold text-primary-foreground"
              >
                Repay Loan
              </button>
            )}
          </motion.div>
        ))}
      </div>
    )}
  </div>
);

export default MyLoans;
