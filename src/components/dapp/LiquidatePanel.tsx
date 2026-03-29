import { useState } from 'react';
import { useLendingPool } from '@/hooks/useLendingPool';
import { toast } from 'sonner';

const LiquidatePanel = () => {
  const [nftId, setNftId] = useState('');
  const { liquidate, loading } = useLendingPool();

  const handleLiquidate = async () => {
    if (!nftId) return toast.error('Enter NFT ID');
    const success = await liquidate(Number(nftId));
    if (success) setNftId('');
  };

  return (
    <div className="glass-card p-6" style={{ borderRadius: '1.5rem' }}>
      <h3 className="text-lg font-semibold text-foreground mb-5">⚠️ Liquidate Position</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Liquidate under-collateralized positions and earn a liquidation bonus.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">NFT ID to Liquidate</label>
          <input
            type="number"
            value={nftId}
            onChange={(e) => setNftId(e.target.value)}
            placeholder="Enter NFT ID"
            className="input-web3 w-full rounded-xl px-4 py-3 text-foreground"
          />
        </div>
        <button
          onClick={handleLiquidate}
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {loading ? '⏳ Processing...' : '⚠️ Liquidate'}
        </button>
      </div>
    </div>
  );
};

export default LiquidatePanel;
