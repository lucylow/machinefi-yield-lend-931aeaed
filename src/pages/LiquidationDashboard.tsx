import { useEffect, useState, useCallback } from 'react';
import { scanLiquidations, LiquidationScan, LiquidationPosition } from '@/hooks/useEdgeFunctions';
import { getErrorMessage } from '@/lib/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Activity, DollarSign, RefreshCw, TrendingDown, Zap } from 'lucide-react';

const statusConfig = {
  healthy: { label: 'Healthy', color: 'bg-primary/20 text-primary border-primary/30', icon: Shield },
  warning: { label: 'Warning', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
  liquidatable: { label: 'Liquidatable', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: TrendingDown },
  underwater: { label: 'Underwater', color: 'bg-red-900/30 text-red-400 border-red-500/40', icon: Zap },
};

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string | number; sub?: string; icon: React.ElementType; accent?: string }) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${accent ?? 'bg-primary/10'}`}>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PositionRow({ pos }: { pos: LiquidationPosition }) {
  const cfg = statusConfig[pos.status];
  const StatusIcon = cfg.icon;
  const ltvPct = Math.round(pos.currentLtv * 100);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
    >
      <td className="p-4 font-mono text-sm text-foreground">{pos.loanId}</td>
      <td className="p-4 text-sm text-muted-foreground">{pos.walletAddress}</td>
      <td className="p-4">
        <span className="text-sm font-medium text-foreground capitalize">{pos.deviceType}</span>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Progress value={Math.min(ltvPct, 100)} className="h-2 w-20" />
          <span className={`text-sm font-semibold ${ltvPct >= 75 ? 'text-destructive' : ltvPct >= 60 ? 'text-yellow-400' : 'text-primary'}`}>
            {ltvPct}%
          </span>
        </div>
      </td>
      <td className="p-4">
        <span className={`text-sm font-bold ${pos.healthFactor < 1 ? 'text-destructive' : pos.healthFactor < 1.2 ? 'text-yellow-400' : 'text-primary'}`}>
          {pos.healthFactor.toFixed(2)}
        </span>
      </td>
      <td className="p-4 text-sm text-foreground">${pos.collateralValueUsd.toLocaleString()}</td>
      <td className="p-4 text-sm text-foreground">${pos.debtUsd.toLocaleString()}</td>
      <td className="p-4">
        <Badge variant="outline" className={`${cfg.color} text-xs`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {cfg.label}
        </Badge>
      </td>
      <td className="p-4 text-sm font-semibold text-primary">
        {pos.keeperRewardUsd ? `$${pos.keeperRewardUsd.toFixed(2)}` : '—'}
      </td>
      <td className="p-4 text-sm text-muted-foreground">{pos.distanceToLiquidation.toFixed(1)}%</td>
    </motion.tr>
  );
}

const LiquidationDashboard = () => {
  const [scan, setScan] = useState<LiquidationScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'warning' | 'liquidatable' | 'underwater'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scanLiquidations();
      setScan(data);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || 'Failed to load liquidation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = scan?.positions.filter(p => filter === 'all' || p.status === filter) ?? [];

  return (
    <div className="min-h-screen bg-background pt-6 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Liquidation Monitor</h1>
            <p className="text-muted-foreground mt-1">Real-time health tracking for all loan positions</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {scan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Activity} label="Total Positions" value={scan.totalPositions} sub={`${scan.healthyCount} healthy`} />
            <StatCard icon={AlertTriangle} label="At Risk" value={scan.warningCount} sub="Need monitoring" accent="bg-yellow-500/10" />
            <StatCard icon={TrendingDown} label="Liquidatable" value={scan.liquidatableCount} sub="Ready for keepers" accent="bg-destructive/10" />
            <StatCard icon={DollarSign} label="Keeper Rewards" value={`$${scan.totalKeeperRewards.toFixed(2)}`} sub="Available to earn" accent="bg-primary/10" />
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'warning', 'liquidatable', 'underwater'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                filter === f
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'text-muted-foreground border-border/50 hover:bg-muted/20'
              }`}
            >
              {f === 'all' ? 'All Positions' : statusConfig[f].label}
              {f !== 'all' && scan && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({scan.positions.filter(p => p.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg text-foreground">Loan Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">No positions match the current filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/10">
                      {['Loan ID', 'Wallet', 'Device', 'LTV', 'Health', 'Collateral', 'Debt', 'Status', 'Keeper Reward', 'Dist. to Liq.'].map(h => (
                        <th key={h} className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(pos => (
                      <PositionRow key={pos.loanId} pos={pos} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {scan && (
          <p className="text-xs text-muted-foreground text-right">
            Last updated: {new Date(scan.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default LiquidationDashboard;
