import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Risk weight configuration per device category
const RISK_WEIGHTS = {
  yieldVolatility: 0.30,
  deviceUptime: 0.20,
  networkReliability: 0.20,
  historicalPerformance: 0.15,
  deviceAge: 0.15,
};

// Device-specific risk parameters
const DEVICE_RISK_PROFILES: Record<string, {
  baseVolatility: number;
  networkReliability: number;
  expectedLifespanMonths: number;
  minLtv: number;
  maxLtv: number;
  baseInterestRate: number; // basis points
}> = {
  helium: { baseVolatility: 0.25, networkReliability: 0.85, expectedLifespanMonths: 60, minLtv: 0.30, maxLtv: 0.55, baseInterestRate: 900 },
  hivemapper: { baseVolatility: 0.18, networkReliability: 0.88, expectedLifespanMonths: 48, minLtv: 0.35, maxLtv: 0.65, baseInterestRate: 800 },
  tesla: { baseVolatility: 0.12, networkReliability: 0.95, expectedLifespanMonths: 120, minLtv: 0.50, maxLtv: 0.75, baseInterestRate: 600 },
  weatherxm: { baseVolatility: 0.22, networkReliability: 0.82, expectedLifespanMonths: 48, minLtv: 0.30, maxLtv: 0.55, baseInterestRate: 850 },
  dimo: { baseVolatility: 0.20, networkReliability: 0.86, expectedLifespanMonths: 72, minLtv: 0.35, maxLtv: 0.60, baseInterestRate: 800 },
  ev_charger: { baseVolatility: 0.15, networkReliability: 0.93, expectedLifespanMonths: 96, minLtv: 0.45, maxLtv: 0.70, baseInterestRate: 650 },
};

interface RiskInput {
  deviceType: string;
  deviceId?: string;
  uptime?: number;           // 0-1
  ageMonths?: number;
  historicalYields?: number[];
  currentDebt?: number;
  collateralValue?: number;
}

function computeRiskScore(input: RiskInput) {
  const profile = DEVICE_RISK_PROFILES[input.deviceType];
  if (!profile) throw new Error(`Unknown device type: ${input.deviceType}`);

  // 1. Yield volatility score (0-100, lower is better)
  let volatilityScore: number;
  if (input.historicalYields && input.historicalYields.length >= 3) {
    const mean = input.historicalYields.reduce((a, b) => a + b, 0) / input.historicalYields.length;
    const variance = input.historicalYields.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) / input.historicalYields.length;
    const cv = Math.sqrt(variance) / mean; // coefficient of variation
    volatilityScore = Math.min(100, cv * 200);
  } else {
    volatilityScore = profile.baseVolatility * 200;
  }

  // 2. Uptime score (0-100, lower is better risk)
  const uptime = input.uptime ?? 0.90;
  const uptimeScore = Math.max(0, (1 - uptime) * 200);

  // 3. Network reliability (0-100)
  const networkScore = (1 - profile.networkReliability) * 200;

  // 4. Historical performance (0-100)
  let perfScore = 50; // neutral default
  if (input.historicalYields && input.historicalYields.length >= 2) {
    const recent = input.historicalYields.slice(-3);
    const older = input.historicalYields.slice(0, -3);
    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const trend = (recentAvg - olderAvg) / olderAvg;
      perfScore = Math.max(0, Math.min(100, 50 - trend * 100));
    }
  }

  // 5. Device age degradation (0-100)
  const ageMonths = input.ageMonths ?? 0;
  const ageRatio = ageMonths / profile.expectedLifespanMonths;
  const ageScore = Math.min(100, ageRatio * 100);

  // Weighted composite
  const compositeRisk = Math.round(
    volatilityScore * RISK_WEIGHTS.yieldVolatility +
    uptimeScore * RISK_WEIGHTS.deviceUptime +
    networkScore * RISK_WEIGHTS.networkReliability +
    perfScore * RISK_WEIGHTS.historicalPerformance +
    ageScore * RISK_WEIGHTS.deviceAge
  );

  const riskScore = Math.max(0, Math.min(100, compositeRisk));

  // Dynamic LTV: interpolate between min and max based on risk
  const riskFraction = riskScore / 100;
  const dynamicLtv = Math.round((profile.maxLtv - (profile.maxLtv - profile.minLtv) * riskFraction) * 100) / 100;

  // Dynamic interest rate: higher risk → higher rate
  const dynamicRate = Math.round(profile.baseInterestRate * (1 + riskFraction * 0.8));

  // Liquidation threshold: always LTV + 15% headroom
  const liquidationThreshold = Math.min(0.90, Math.round((dynamicLtv + 0.15) * 100) / 100);

  // Health factor (if position exists)
  let healthFactor: number | null = null;
  if (input.currentDebt && input.collateralValue && input.collateralValue > 0) {
    const currentLtv = input.currentDebt / input.collateralValue;
    healthFactor = Math.round((liquidationThreshold / currentLtv) * 100) / 100;
  }

  return {
    riskScore,
    riskLevel: riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : riskScore < 80 ? 'high' : 'critical',
    dynamicLtv,
    dynamicInterestRate: dynamicRate,
    liquidationThreshold,
    healthFactor,
    breakdown: {
      yieldVolatility: { score: Math.round(volatilityScore), weight: RISK_WEIGHTS.yieldVolatility },
      deviceUptime: { score: Math.round(uptimeScore), weight: RISK_WEIGHTS.deviceUptime },
      networkReliability: { score: Math.round(networkScore), weight: RISK_WEIGHTS.networkReliability },
      historicalPerformance: { score: Math.round(perfScore), weight: RISK_WEIGHTS.historicalPerformance },
      deviceAge: { score: Math.round(ageScore), weight: RISK_WEIGHTS.deviceAge },
    },
    recommendations: [] as string[],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const view = url.searchParams.get('view');

    // GET: return supported device risk profiles
    if (req.method === 'GET' && view === 'profiles') {
      const profiles = Object.entries(DEVICE_RISK_PROFILES).map(([key, p]) => ({
        deviceType: key,
        minLtv: p.minLtv,
        maxLtv: p.maxLtv,
        baseInterestRate: p.baseInterestRate,
        baseVolatility: p.baseVolatility,
        networkReliability: p.networkReliability,
      }));
      return new Response(JSON.stringify({ profiles }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: compute risk for a specific device/position
    const body: RiskInput | RiskInput[] = await req.json();

    // Support batch risk scoring
    if (Array.isArray(body)) {
      const results = body.map((input) => {
        try {
          return { deviceId: input.deviceId, ...computeRiskScore(input) };
        } catch (e) {
          return { deviceId: input.deviceId, error: (e as Error).message };
        }
      });
      return new Response(JSON.stringify({ results, timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = computeRiskScore(body);

    // Add recommendations
    if (result.riskScore > 70) {
      result.recommendations.push("Consider reducing position size or adding more collateral");
    }
    if (result.breakdown.yieldVolatility.score > 60) {
      result.recommendations.push("Yield is highly volatile — monitor oracle feeds closely");
    }
    if (result.breakdown.deviceUptime.score > 40) {
      result.recommendations.push("Device uptime is below optimal — check hardware health");
    }
    if (result.healthFactor !== null && result.healthFactor < 1.2) {
      result.recommendations.push("WARNING: Position is near liquidation threshold");
    }

    return new Response(JSON.stringify({
      deviceType: body.deviceType,
      deviceId: body.deviceId || null,
      ...result,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("risk-engine error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
