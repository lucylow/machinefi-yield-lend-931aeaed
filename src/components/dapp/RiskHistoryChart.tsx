import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface DeviceHistoryConfig {
  deviceType: string;
  label: string;
  icon: string;
  color: string;
  baseRisk: number;
  drift: number;
  volatility: number;
}

const DEVICE_CONFIGS: DeviceHistoryConfig[] = [
  { deviceType: 'helium', label: 'Helium', icon: '📡', color: 'hsl(160, 100%, 48%)', baseRisk: 38, drift: 0.4, volatility: 5 },
  { deviceType: 'hivemapper', label: 'Hivemapper', icon: '🗺️', color: 'hsl(190, 100%, 48%)', baseRisk: 32, drift: -0.2, volatility: 4 },
  { deviceType: 'tesla', label: 'Tesla', icon: '⚡', color: 'hsl(45, 100%, 55%)', baseRisk: 18, drift: 0.1, volatility: 2 },
  { deviceType: 'weatherxm', label: 'WeatherXM', icon: '🌦️', color: 'hsl(280, 70%, 60%)', baseRisk: 42, drift: 0.6, volatility: 6 },
  { deviceType: 'dimo', label: 'DIMO', icon: '🚗', color: 'hsl(20, 90%, 55%)', baseRisk: 35, drift: -0.3, volatility: 4 },
  { deviceType: 'ev_charger', label: 'EV Charger', icon: '🔋', color: 'hsl(120, 60%, 50%)', baseRisk: 22, drift: 0.2, volatility: 3 },
];

type TimeRange = '7d' | '30d' | '90d';

type DeviceTypeKey = (typeof DEVICE_CONFIGS)[number]['deviceType'];
type RiskChartPoint = { date: string } & Partial<Record<DeviceTypeKey, number>>;

function generateHistory(config: DeviceHistoryConfig, days: number, seed: number) {
  const points: { date: string; risk: number; ltv: number }[] = [];
  let risk = config.baseRisk;
  const now = Date.now();
  const seededRandom = (i: number) => {
    const x = Math.sin(seed * 9301 + i * 4973) * 10000;
    return x - Math.floor(x);
  };

  for (let d = days; d >= 0; d--) {
    const date = new Date(now - d * 86400000);
    const noise = (seededRandom(d) - 0.5) * config.volatility * 2;
    risk = Math.max(5, Math.min(95, risk + config.drift + noise));
    const riskFraction = risk / 100;
    const maxLtv = config.deviceType === 'tesla' ? 0.75 : config.deviceType === 'ev_charger' ? 0.70 : 0.55;
    const minLtv = config.deviceType === 'tesla' ? 0.50 : config.deviceType === 'ev_charger' ? 0.45 : 0.30;
    const ltv = Math.round((maxLtv - (maxLtv - minLtv) * riskFraction) * 100);
    points.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      risk: Math.round(risk),
      ltv,
    });
  }
  return points;
}

interface Props {
  currentScores?: Record<string, number>;
}

const RiskHistoryChart = ({ currentScores }: Props) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(
    new Set(DEVICE_CONFIGS.map(d => d.deviceType))
  );
  const [chartMode, setChartMode] = useState<'risk' | 'ltv'>('risk');

  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  const chartData = useMemo(() => {
    const allHistories = DEVICE_CONFIGS.filter(d => selectedDevices.has(d.deviceType))
      .map(d => ({ ...d, history: generateHistory(d, days, d.baseRisk * 7) }));

    const combined: RiskChartPoint[] = [];
    const length = allHistories[0]?.history.length ?? 0;
    for (let i = 0; i < length; i++) {
      const point: RiskChartPoint = { date: allHistories[0]?.history[i]?.date ?? '' };
      allHistories.forEach(d => {
        const h = d.history[i];
        if (h) point[d.deviceType] = chartMode === 'risk' ? h.risk : h.ltv;
      });
      combined.push(point);
    }
    return combined;
  }, [days, selectedDevices, chartMode]);

  const toggleDevice = (dt: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(dt)) { if (next.size > 1) next.delete(dt); }
      else next.add(dt);
      return next;
    });
  };

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Historical Risk Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              {(['risk', 'ltv'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    chartMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'risk' ? 'Risk Score' : 'Dynamic LTV'}
                </button>
              ))}
            </div>
            <div className="flex bg-muted rounded-lg p-0.5">
              {(['7d', '30d', '90d'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    timeRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device toggle pills */}
        <div className="flex flex-wrap gap-2">
          {DEVICE_CONFIGS.map(d => (
            <button
              key={d.deviceType}
              onClick={() => toggleDevice(d.deviceType)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedDevices.has(d.deviceType)
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border/50 bg-muted/30 text-muted-foreground'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedDevices.has(d.deviceType) ? d.color : 'hsl(var(--muted-foreground))' }}
              />
              {d.icon} {d.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval={days > 30 ? 6 : days > 14 ? 2 : 0}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                domain={chartMode === 'risk' ? [0, 100] : [20, 80]}
                tickFormatter={v => chartMode === 'ltv' ? `${v}%` : v}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  color: 'hsl(var(--foreground))',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(value: number, name: string) => {
                  const cfg = DEVICE_CONFIGS.find(d => d.deviceType === name);
                  return [chartMode === 'ltv' ? `${value}%` : value, cfg?.label ?? name];
                }}
              />
              {DEVICE_CONFIGS.filter(d => selectedDevices.has(d.deviceType)).map(d => (
                <Line
                  key={d.deviceType}
                  type="monotone"
                  dataKey={d.deviceType}
                  stroke={d.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: d.color }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskHistoryChart;
