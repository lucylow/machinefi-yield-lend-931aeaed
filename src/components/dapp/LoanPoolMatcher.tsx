import { useState, useEffect, useCallback } from 'react';
import { matchLoan, type PoolMatch, type LoanMatchResult } from '@/hooks/useEdgeFunctions';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';

interface LoanPoolMatcherProps {
  deviceType: string;
  collateralValueUsd: number;
  desiredLoanUsd: number;
  riskScore?: number;
}

const STATUS_STYLES: Record<string, string> = {
  best: 'border-primary/40 bg-primary/5',
  eligible: 'border-border bg-card/50',
  ineligible: 'border-border/50 bg-muted/30 opacity-60',
};

const LoanPoolMatcher = ({ deviceType, collateralValueUsd, desiredLoanUsd, riskScore }: LoanPoolMatcherProps) => {
  const [result, setResult] = useState<LoanMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const canSearch = Boolean(deviceType && collateralValueUsd > 0 && desiredLoanUsd > 0);

  const handleMatch = useCallback(async () => {
    if (!deviceType || collateralValueUsd <= 0 || desiredLoanUsd <= 0) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await matchLoan({ deviceType, collateralValueUsd, desiredLoanUsd, riskScore });
      setResult(data);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [deviceType, collateralValueUsd, desiredLoanUsd, riskScore]);

  // Auto-search when inputs change meaningfully
  useEffect(() => {
    if (!canSearch) return;
    const timeout = setTimeout(() => {
      void handleMatch();
    }, 600);
    return () => clearTimeout(timeout);
  }, [canSearch, handleMatch]);

  const getPoolStyle = (pool: PoolMatch, isBest: boolean) => {
    if (isBest && pool.eligible) return STATUS_STYLES.best;
    if (pool.eligible) return STATUS_STYLES.eligible;
    return STATUS_STYLES.ineligible;
  };

  return (
    <div className="glass-card p-6" style={{ borderRadius: '1.5rem' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-foreground">🏦 Lending Pool Match</h3>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse">Matching...</span>
        )}
      </div>

      {!hasSearched && !loading && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm">Configure your loan parameters above to find the best lending pool.</p>
        </div>
      )}

      {result && result.allPools.length > 0 && (
        <div className="space-y-3">
          {/* Best match highlight */}
          {result.bestMatch && (
            <div className="px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4 flex items-center gap-2">
              <span>⭐</span>
              <span>Best match: <strong>{result.bestMatch.poolName}</strong> at {(result.bestMatch.effectiveRate / 100).toFixed(1)}% APR</span>
            </div>
          )}

          {/* Pool cards */}
          {result.allPools.map((pool) => {
            const isBest = pool.poolId === result.bestMatch?.poolId;
            return (
              <div
                key={pool.poolId}
                className={`rounded-xl border p-4 transition-all duration-200 ${getPoolStyle(pool, isBest)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isBest && pool.eligible && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                        Best
                      </span>
                    )}
                    <h4 className="font-semibold text-foreground text-sm">{pool.poolName}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{(pool.effectiveRate / 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">APR</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-muted-foreground">Max LTV</p>
                    <p className="font-semibold text-foreground">{(pool.effectiveLtv * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-semibold text-foreground">${(pool.availableLiquidity / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Loan</p>
                    <p className="font-semibold text-foreground">${pool.maxLoanUsd.toLocaleString()}</p>
                  </div>
                </div>

                {/* Match score bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pool.matchScore}%`,
                        background: pool.eligible
                          ? `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))`
                          : 'hsl(var(--muted-foreground))',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
                    {pool.matchScore}
                  </span>
                </div>

                {!pool.eligible && pool.reason && (
                  <p className="text-[11px] text-destructive/80 mt-2">⚠ {pool.reason}</p>
                )}
              </div>
            );
          })}

          {!result.bestMatch && (
            <div className="px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              No pools currently eligible for this loan. Try reducing the loan amount or changing the device type.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoanPoolMatcher;
