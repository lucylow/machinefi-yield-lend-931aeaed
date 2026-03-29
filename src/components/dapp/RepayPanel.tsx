import { useState } from 'react';
import { useLendingPool } from '@/hooks/useLendingPool';
import { toast } from 'sonner';

const RepayPanel = () => {
  const [nftId, setNftId] = useState('');
  const [amount, setAmount] = useState('');
  const { repay, loading } = useLendingPool();

  const handleRepay = async () => {
    if (!nftId) return toast.error('Enter NFT ID');
    if (!amount || isNaN(Number(amount))) return toast.error('Enter valid amount');
    // On-chain repay settles principal + accrued interest; amount is validated for UX only.
    const success = await repay(Number(nftId), amount);
    if (success) {
      setNftId('');
      setAmount('');
    }
  };

  return (
    <div className="glass-card p-6" style={{ borderRadius: '1.5rem' }}>
      <h3 className="text-lg font-semibold text-foreground mb-5">💸 Repay Loan</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">NFT ID</label>
          <input
            type="number"
            value={nftId}
            onChange={(e) => setNftId(e.target.value)}
            placeholder="Enter NFT ID"
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Expected repayment (stablecoin, for reference)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
          />
        </div>
        <button
          onClick={handleRepay}
          disabled={loading}
          className="btn-gradient w-full py-3 rounded-full font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? '⏳ Processing...' : '💸 Repay'}
        </button>
      </div>
    </div>
  );
};

export default RepayPanel;
