import { useState } from 'react';
import { useLendingPool } from '@/hooks/useLendingPool';
import type { HardwareDevice } from '@/hooks/useHardwareNFT';
import { toast } from 'sonner';
import { useWeb3 } from '@/contexts/Web3Context';
import { ACTION_COPY } from '@/config/bnbStack';

interface Props {
  hardwareNFTs: HardwareDevice[];
}

const DepositHardware = ({ hardwareNFTs }: Props) => {
  const [selectedNFT, setSelectedNFT] = useState('');
  const [yieldPercentage, setYieldPercentage] = useState(70);
  const [borrowAmount, setBorrowAmount] = useState('');
  const { deposit, loading } = useLendingPool();
  const { isConnected, isCorrectNetwork } = useWeb3();

  const handleDeposit = async () => {
    if (!selectedNFT) return toast.error('Select a hardware NFT');
    if (!borrowAmount || isNaN(Number(borrowAmount))) return toast.error('Enter a valid borrow amount');
    const success = await deposit(Number(selectedNFT), yieldPercentage, borrowAmount);
    if (success) {
      setSelectedNFT('');
      setBorrowAmount('');
    }
  };

  return (
    <div className="glass-card p-6" style={{ borderRadius: '1.5rem' }}>
      <h3 className="text-lg font-semibold text-foreground mb-2">🏦 Deposit & Borrow</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{ACTION_COPY.borrow}</p>
      {isConnected && !isCorrectNetwork && (
        <p className="text-xs text-amber-200/90 mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          {ACTION_COPY.wrongNetwork}
        </p>
      )}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Your Hardware NFTs</label>
          <select
            value={selectedNFT}
            onChange={(e) => setSelectedNFT(e.target.value)}
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
          >
            <option value="">Select NFT</option>
            {hardwareNFTs.map(nft => (
              <option key={nft.id} value={nft.id}>#{nft.id} — {nft.type} (${nft.monthlyYield}/mo)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Yield to Tokenize (%)</label>
          <input
            type="range"
            min={10}
            max={100}
            value={yieldPercentage}
            onChange={(e) => setYieldPercentage(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>10%</span>
            <span className="text-primary font-semibold">{yieldPercentage}%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Borrow Amount (USD)</label>
          <input
            type="number"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="Enter amount"
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
            min={0}
          />
        </div>

        <button
          onClick={handleDeposit}
          disabled={loading || (isConnected && !isCorrectNetwork)}
          className="btn-gradient w-full py-3 rounded-full font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? '⏳ Processing...' : '✅ Deposit & Borrow (BSC)'}
        </button>
      </div>
    </div>
  );
};

export default DepositHardware;
