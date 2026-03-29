import { useState } from 'react';
import { predictYield, type PredictYieldResponse } from '@/hooks/useEdgeFunctions';
import { getErrorMessage } from '@/lib/errors';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import type { AiLoanDefaults } from '@/pages/Borrow';

interface YieldPredictionPanelProps {
  onPrediction?: (defaults: AiLoanDefaults) => void;
  onDeviceChange?: (deviceType: string) => void;
  onRiskScore?: (score: number) => void;
}

const DEVICE_TYPES = [
  { value: 'helium', label: 'Helium Hotspot' },
  { value: 'hivemapper', label: 'Hivemapper Dashcam' },
  { value: 'tesla', label: 'Tesla Vehicle' },
  { value: 'weatherxm', label: 'WeatherXM Station' },
  { value: 'dimo', label: 'DIMO Vehicle Miner' },
  { value: 'ev_charger', label: 'EV Charger' },
];

const YieldPredictionPanel = ({ onPrediction, onDeviceChange, onRiskScore }: YieldPredictionPanelProps) => {
  const [deviceType, setDeviceType] = useState('helium');

  const handleDeviceChange = (value: string) => {
    setDeviceType(value);
    onDeviceChange?.(value);
  };
  const [prediction, setPrediction] = useState<PredictYieldResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const result = await predictYield({ deviceType, horizonMonths: 12 });
      setPrediction(result);
      if (result.prediction && onPrediction) {
        onPrediction({
          monthlyYield: result.prediction.predictedMonthlyYield,
          ltv: result.prediction.recommendedLtv * 100,
          interestRate: result.prediction.recommendedInterestRate / 100,
        });
        onRiskScore?.(result.prediction.riskScore);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const p = prediction?.prediction;
  const riskColor = !p ? 'text-muted-foreground' : p.riskScore < 30 ? 'text-primary' : p.riskScore < 60 ? 'text-yellow-400' : 'text-destructive';
  const confidenceColor = !p ? 'text-muted-foreground' : p.confidenceScore > 70 ? 'text-primary' : p.confidenceScore > 40 ? 'text-yellow-400' : 'text-destructive';

  return (
    <div className="glass-card p-6 lg:col-span-2" style={{ borderRadius: '1.5rem' }}>
      <h3 className="text-lg font-semibold text-foreground mb-5">🤖 AI Yield Prediction</h3>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={deviceType}
          onChange={(e) => handleDeviceChange(e.target.value)}
          className="input-web3 flex-1 rounded-xl px-4 py-3 text-foreground"
        >
          {DEVICE_TYPES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <button
          onClick={handlePredict}
          disabled={loading}
          className="btn-gradient px-6 py-3 rounded-full font-semibold text-primary-foreground disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? '⏳ Analyzing...' : '🔮 Predict Yield'}
        </button>
      </div>

      {p && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Monthly Yield', value: `$${p.predictedMonthlyYield.toFixed(2)}`, color: 'text-primary' },
              { label: 'Confidence', value: `${p.confidenceScore}%`, color: confidenceColor },
              { label: 'Risk Score', value: `${p.riskScore}/100`, color: riskColor },
              { label: 'Rec. LTV', value: `${(p.recommendedLtv * 100).toFixed(0)}%`, color: 'text-secondary' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4 text-center" style={{ borderRadius: '1rem' }}>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Yield curve chart */}
          <div className="glass-card p-4" style={{ borderRadius: '1rem' }}>
            <p className="text-sm font-semibold text-foreground mb-3">12-Month Yield Curve</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={p.yieldCurve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 100%, 48%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(160, 100%, 48%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(190, 100%, 48%)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(190, 100%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(195, 40%, 18%)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(200, 15%, 55%)', fontSize: 12 }} tickFormatter={(v) => `M${v}`} />
                <YAxis tick={{ fill: 'hsl(200, 15%, 55%)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} width={50} />
                <Tooltip
                  contentStyle={{ background: 'hsl(195, 50%, 6%)', border: '1px solid hsl(195, 40%, 18%)', borderRadius: '0.75rem', color: 'hsl(180, 20%, 90%)' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  labelFormatter={(label) => `Month ${label}`}
                />
                <Area type="monotone" dataKey="upperBound" stroke="none" fill="url(#bandGrad)" />
                <Area type="monotone" dataKey="lowerBound" stroke="none" fill="transparent" />
                <Area type="monotone" dataKey="predictedYield" stroke="hsl(160, 100%, 48%)" strokeWidth={2} fill="url(#yieldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Factors */}
          {p.factors && p.factors.length > 0 && (
            <div className="glass-card p-4" style={{ borderRadius: '1rem' }}>
              <p className="text-sm font-semibold text-foreground mb-3">Key Factors</p>
              <div className="space-y-2">
                {p.factors.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={f.impact === 'positive' ? 'text-primary' : f.impact === 'negative' ? 'text-destructive' : 'text-muted-foreground'}>
                        {f.impact === 'positive' ? '▲' : f.impact === 'negative' ? '▼' : '●'}
                      </span>
                      <span className="text-foreground font-medium">{f.name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs max-w-[50%] text-right">{f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="glass-card p-4 border border-primary/20" style={{ borderRadius: '1rem' }}>
            <p className="text-sm text-muted-foreground mb-1">💡 AI Recommendation</p>
            <p className="text-foreground text-sm">
              Based on analysis, borrow up to <span className="text-primary font-bold">{(p.recommendedLtv * 100).toFixed(0)}% LTV</span> at{' '}
              <span className="text-secondary font-bold">{(p.recommendedInterestRate / 100).toFixed(1)}% APR</span>.
              Projected annual yield: <span className="text-primary font-bold">${p.predictedAnnualYield.toFixed(0)}</span>.
            </p>
          </div>
        </div>
      )}

      {!p && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-3xl mb-2">📈</p>
          <p>Select a device and run AI prediction to see yield curves before borrowing.</p>
        </div>
      )}
    </div>
  );
};

export default YieldPredictionPanel;
