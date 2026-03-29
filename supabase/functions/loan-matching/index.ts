import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Lending pool configurations
const POOLS: Record<string, {
  name: string;
  totalLiquidityUsd: number;
  utilization: number;
  baseRate: number; // bps
  acceptedDevices: string[];
  maxLtvOverride?: Record<string, number>;
  minCollateralUsd: number;
  maxLoanUsd: number;
}> = {
  'pool-alpha': {
    name: 'Alpha Yield Pool',
    totalLiquidityUsd: 2_500_000,
    utilization: 0.62,
    baseRate: 700,
    acceptedDevices: ['helium', 'hivemapper', 'weatherxm', 'dimo'],
    minCollateralUsd: 200,
    maxLoanUsd: 50_000,
  },
  'pool-prime': {
    name: 'Prime Hardware Pool',
    totalLiquidityUsd: 5_000_000,
    utilization: 0.45,
    baseRate: 550,
    acceptedDevices: ['tesla', 'ev_charger'],
    maxLtvOverride: { tesla: 0.78, ev_charger: 0.72 },
    minCollateralUsd: 1000,
    maxLoanUsd: 200_000,
  },
  'pool-defi': {
    name: 'DeFi Flex Pool',
    totalLiquidityUsd: 1_000_000,
    utilization: 0.78,
    baseRate: 900,
    acceptedDevices: ['helium', 'hivemapper', 'weatherxm', 'dimo', 'tesla', 'ev_charger'],
    minCollateralUsd: 100,
    maxLoanUsd: 25_000,
  },
};

// Risk-adjusted rates from risk-engine
const DEVICE_RISK_DEFAULTS: Record<string, { riskScore: number; dynamicLtv: number; baseInterestRate: number }> = {
  helium: { riskScore: 38, dynamicLtv: 0.48, baseInterestRate: 900 },
  hivemapper: { riskScore: 32, dynamicLtv: 0.55, baseInterestRate: 800 },
  tesla: { riskScore: 18, dynamicLtv: 0.70, baseInterestRate: 600 },
  weatherxm: { riskScore: 42, dynamicLtv: 0.45, baseInterestRate: 850 },
  dimo: { riskScore: 35, dynamicLtv: 0.52, baseInterestRate: 800 },
  ev_charger: { riskScore: 22, dynamicLtv: 0.65, baseInterestRate: 650 },
};

interface MatchRequest {
  deviceType: string;
  collateralValueUsd: number;
  desiredLoanUsd: number;
  riskScore?: number;
  preferLowRate?: boolean;
}

interface PoolMatch {
  poolId: string;
  poolName: string;
  availableLiquidity: number;
  effectiveRate: number;
  effectiveLtv: number;
  maxLoanUsd: number;
  matchScore: number;
  eligible: boolean;
  reason?: string;
}

function matchPools(req: MatchRequest): PoolMatch[] {
  const riskDefaults = DEVICE_RISK_DEFAULTS[req.deviceType];
  if (!riskDefaults) throw new Error(`Unknown device type: ${req.deviceType}`);

  const riskScore = req.riskScore ?? riskDefaults.riskScore;
  const riskMultiplier = 1 + (riskScore / 100) * 0.5;

  return Object.entries(POOLS).map(([poolId, pool]) => {
    const accepted = pool.acceptedDevices.includes(req.deviceType);
    const availableLiquidity = Math.round(pool.totalLiquidityUsd * (1 - pool.utilization));

    // Effective LTV: pool override or risk-adjusted default
    const effectiveLtv = pool.maxLtvOverride?.[req.deviceType] ?? riskDefaults.dynamicLtv;
    const maxLoanFromLtv = Math.round(req.collateralValueUsd * effectiveLtv);
    const maxLoanUsd = Math.min(maxLoanFromLtv, pool.maxLoanUsd, availableLiquidity);

    // Effective rate: pool base + utilization premium + risk adjustment
    const utilizationPremium = Math.round(pool.utilization * 300); // up to 3% extra
    const riskPremium = Math.round((riskScore / 100) * 200); // up to 2% extra
    const effectiveRate = pool.baseRate + utilizationPremium + riskPremium;

    // Eligibility
    let eligible = true;
    let reason: string | undefined;
    if (!accepted) { eligible = false; reason = 'Device type not accepted by this pool'; }
    else if (req.collateralValueUsd < pool.minCollateralUsd) { eligible = false; reason = `Minimum collateral is $${pool.minCollateralUsd}`; }
    else if (req.desiredLoanUsd > maxLoanUsd) { eligible = false; reason = `Max loan available: $${maxLoanUsd}`; }

    // Match score (0-100): considers rate, liquidity, and eligibility
    let matchScore = 0;
    if (eligible) {
      const rateScore = Math.max(0, 100 - (effectiveRate / 20)); // lower rate = higher score
      const liquidityScore = Math.min(100, (availableLiquidity / req.desiredLoanUsd) * 50);
      const ltvScore = effectiveLtv * 100;
      matchScore = Math.round(rateScore * 0.4 + liquidityScore * 0.3 + ltvScore * 0.3);
    }

    return {
      poolId,
      poolName: pool.name,
      availableLiquidity,
      effectiveRate,
      effectiveLtv: Math.round(effectiveLtv * 100) / 100,
      maxLoanUsd,
      matchScore,
      eligible,
      reason,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // GET: list pools overview
    if (req.method === 'GET') {
      const poolList = Object.entries(POOLS).map(([id, p]) => ({
        poolId: id,
        name: p.name,
        totalLiquidity: p.totalLiquidityUsd,
        availableLiquidity: Math.round(p.totalLiquidityUsd * (1 - p.utilization)),
        utilization: p.utilization,
        baseRate: p.baseRate,
        acceptedDevices: p.acceptedDevices,
        minCollateral: p.minCollateralUsd,
        maxLoan: p.maxLoanUsd,
      }));

      return new Response(JSON.stringify({ pools: poolList, timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: match borrower to pools
    const body: MatchRequest = await req.json();
    if (!body.deviceType || !body.collateralValueUsd || !body.desiredLoanUsd) {
      return new Response(JSON.stringify({ error: 'Missing required fields: deviceType, collateralValueUsd, desiredLoanUsd' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matches = matchPools(body);
    const bestMatch = matches.find(m => m.eligible);

    return new Response(JSON.stringify({
      request: body,
      bestMatch: bestMatch ?? null,
      allPools: matches,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("loan-matching error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
