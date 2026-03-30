import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, Activity, RefreshCw, Satellite, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { batchAssessRisk, type RiskAssessment } from '@/hooks/useEdgeFunctions';
import { getErrorMessage } from '@/lib/errors';
import RiskHistoryChart from '@/components/dapp/RiskHistoryChart';
import { PageHeader } from '@/components/Layout/PageHeader';
import { AppPage } from '@/components/Layout/AppPage';
import { OracleFreshnessBadge, ProofFreshnessBadge } from '@/components/protocol/FreshnessBadge';
import { useProtocolSimulation } from '@/contexts/ProtocolSimulationContext';
import { formatRelativeIso } from '@/lib/format';

const DEVICES = [
  { deviceType: 'helium', label: 'Helium Hotspot', icon: '📡', uptime: 0.92, ageMonths: 14, historicalYields: [42, 38, 45, 40, 43, 37] },
  { deviceType: 'hivemapper', label: 'Hivemapper Dashcam', icon: '🗺️', uptime: 0.88, ageMonths: 8, historicalYields: [28, 32, 30, 35, 33] },
  { deviceType: 'tesla', label: 'Tesla Powerwall', icon: '⚡', uptime: 0.97, ageMonths: 24, historicalYields: [120, 118, 125, 122, 121, 119] },
  { deviceType: 'weatherxm', label: 'WeatherXM Station', icon: '🌦️', uptime: 0.85, ageMonths: 10, historicalYields: [15, 18, 12, 20, 16] },
  { deviceType: 'dimo', label: 'DIMO Vehicle', icon: '🚗', uptime: 0.90, ageMonths: 6, historicalYields: [22, 25, 23, 27, 24] },
  { deviceType: 'ev_charger', label: 'EV Charger Node', icon: '🔋', uptime: 0.94, ageMonths: 18, historicalYields: [85, 90, 88, 92, 87, 91] },
];

const riskLevelColor: Record<string, string> = {
  low: 'bg-primary/20 text-primary border-primary/30',
  medium: 'bg-secondary/20 text-secondary border-secondary/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
};

const riskBarColor = (score: number) => {
  if (score < 30) return 'bg-primary';
  if (score < 60) return 'bg-secondary';
  if (score < 80) return 'bg-orange-500';
  return 'bg-destructive';
};

const RiskDashboard = () => {
  const { snapshot } = useProtocolSimulation();
  const [assessments, setAssessments] = useState<(RiskAssessment & { label: string; icon: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const { results } = await batchAssessRisk(
        DEVICES.map(d => ({
          deviceType: d.deviceType,
          deviceId: `demo-${d.deviceType}`,
          uptime: d.uptime,
          ageMonths: d.ageMonths,
          historicalYields: d.historicalYields,
        }))
      );
      const merged = results.map((r, i) => ({
        ...r,
        label: DEVICES[i].label,
        icon: DEVICES[i].icon,
      })) as (RiskAssessment & { label: string; icon: string })[];
      setAssessments(merged);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRisk(); }, []);

  const avgRisk = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + a.riskScore, 0) / assessments.length)
    : 0;
  const avgLtv = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + a.dynamicLtv, 0) / assessments.length * 100)
    : 0;

  return (
    <AppPage className="min-h-screen">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Risk center"
          title="Risk & monitoring"
          description="Portfolio health, oracle and proof freshness, keeper coverage, and recent protocol events. LTV is continuous — not a one-time check."
          actions={
            <Button onClick={fetchRisk} disabled={loading} variant="outline" className="gap-2 border-border rounded-full">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Satellite className="h-5 w-5 text-primary shrink-0" aria-hidden />
              <CardTitle className="text-sm font-display">Oracle freshness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <OracleFreshnessBadge state="live" />
              <p className="text-xs text-muted-foreground">BSC feed heartbeat within SLA. Secondary route on standby (demo).</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Shield className="h-5 w-5 text-secondary shrink-0" aria-hidden />
              <CardTitle className="text-sm font-display">Proof cadence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProofFreshnessBadge minutesAgo={32} />
              <p className="text-xs text-muted-foreground">Stale proofs trigger haircuts until bundles reconcile on Greenfield.</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Bot className="h-5 w-5 text-amber-400 shrink-0" aria-hidden />
              <CardTitle className="text-sm font-display">Keepers</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="text-foreground font-semibold">4 / 4 operational (demo)</p>
              <p>Liquidation and interest indexing bots reporting healthy heartbeats on opBNB.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Recent risk events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.riskEvents.slice(0, 6).map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap gap-x-3 gap-y-1 text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0"
              >
                <span className="font-mono text-muted-foreground">{formatRelativeIso(e.at)}</span>
                <Badge
                  variant="outline"
                  className={
                    e.severity === "critical"
                      ? "border-destructive/50 text-destructive"
                      : e.severity === "warning"
                        ? "border-amber-500/50 text-amber-400"
                        : "border-border text-muted-foreground"
                  }
                >
                  {e.severity}
                </Badge>
                <span className="text-foreground flex-1 min-w-[200px]">{e.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Avg Risk Score', value: `${avgRisk}/100`, icon: <Activity className="h-5 w-5 text-primary" /> },
            { label: 'Avg Dynamic LTV', value: `${avgLtv}%`, icon: <TrendingUp className="h-5 w-5 text-secondary" /> },
            { label: 'Devices Monitored', value: String(assessments.length), icon: <Shield className="h-5 w-5 text-primary" /> },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border/50 bg-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="p-2 rounded-lg bg-muted">{s.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{loading ? '—' : s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4 flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Historical chart */}
        <RiskHistoryChart />

        {/* Device grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-border/50 bg-card animate-pulse">
                  <CardContent className="p-6 h-52" />
                </Card>
              ))
            : assessments.map((a, i) => (
                <motion.div key={a.deviceType} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border/50 bg-card hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                          <span className="text-xl">{a.icon}</span>
                          {a.label}
                        </CardTitle>
                        <Badge className={`text-xs ${riskLevelColor[a.riskLevel]}`}>
                          {a.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Risk score bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Risk Score</span>
                          <span className="font-mono text-foreground">{a.riskScore}/100</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${riskBarColor(a.riskScore)}`} style={{ width: `${a.riskScore}%` }} />
                        </div>
                      </div>

                      {/* Key metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Dynamic LTV</p>
                          <p className="text-lg font-bold text-foreground">{Math.round(a.dynamicLtv * 100)}%</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Interest Rate</p>
                          <p className="text-lg font-bold text-foreground">{(a.dynamicInterestRate / 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Liquidation</p>
                          <p className="text-lg font-bold text-foreground">{Math.round(a.liquidationThreshold * 100)}%</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Health Factor</p>
                          <p className="text-lg font-bold text-foreground">{a.healthFactor ?? 'N/A'}</p>
                        </div>
                      </div>

                      {/* Recommendations */}
                      {a.recommendations && a.recommendations.length > 0 && (
                        <div className="border-t border-border/50 pt-3">
                          {a.recommendations.map((r, ri) => (
                            <p key={ri} className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
                              <AlertTriangle className="h-3 w-3 text-orange-400 mt-0.5 shrink-0" />
                              {r}
                            </p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </div>
      </div>
    </AppPage>
  );
};

export default RiskDashboard;
