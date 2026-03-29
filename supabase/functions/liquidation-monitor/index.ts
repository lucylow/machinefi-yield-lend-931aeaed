import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Liquidation thresholds per device type
const LIQUIDATION_CONFIG: Record<string, {
  warningLtv: number;
  liquidationLtv: number;
  partialLiquidationPct: number;
  keeperBonus: number;
}> = {
  helium: { warningLtv: 0.60, liquidationLtv: 0.75, partialLiquidationPct: 0.50, keeperBonus: 0.05 },
  hivemapper: { warningLtv: 0.70, liquidationLtv: 0.80, partialLiquidationPct: 0.50, keeperBonus: 0.05 },
  tesla: { warningLtv: 0.80, liquidationLtv: 0.90, partialLiquidationPct: 0.40, keeperBonus: 0.03 },
  weatherxm: { warningLtv: 0.60, liquidationLtv: 0.75, partialLiquidationPct: 0.50, keeperBonus: 0.05 },
  dimo: { warningLtv: 0.65, liquidationLtv: 0.78, partialLiquidationPct: 0.50, keeperBonus: 0.05 },
  ev_charger: { warningLtv: 0.75, liquidationLtv: 0.85, partialLiquidationPct: 0.45, keeperBonus: 0.04 },
};

interface LoanPosition {
  loanId: string;
  walletAddress: string;
  deviceType: string;
  collateralValueUsd: number;
  debtUsd: number;
  interestRate: number;
  startTimestamp: string;
}

interface MonitorResult {
  loanId: string;
  walletAddress: string;
  deviceType: string;
  currentLtv: number;
  healthFactor: number;
  status: 'healthy' | 'warning' | 'liquidatable' | 'underwater';
  collateralValueUsd: number;
  debtUsd: number;
  liquidationPrice: number;
  distanceToLiquidation: number;
  action: string | null;
  keeperRewardUsd: number | null;
}

function assessPosition(pos: LoanPosition): MonitorResult {
  const config = LIQUIDATION_CONFIG[pos.deviceType] ?? LIQUIDATION_CONFIG.helium;
  const currentLtv = pos.debtUsd / pos.collateralValueUsd;
  const healthFactor = config.liquidationLtv / currentLtv;
  const liquidationPrice = pos.debtUsd / config.liquidationLtv;
  const distanceToLiquidation = ((config.liquidationLtv - currentLtv) / config.liquidationLtv) * 100;

  let status: MonitorResult['status'];
  let action: string | null = null;
  let keeperRewardUsd: number | null = null;

  if (currentLtv >= 1.0) {
    status = 'underwater';
    action = 'FULL_LIQUIDATION';
    keeperRewardUsd = Math.round(pos.collateralValueUsd * config.keeperBonus * 100) / 100;
  } else if (currentLtv >= config.liquidationLtv) {
    status = 'liquidatable';
    action = 'PARTIAL_LIQUIDATION';
    keeperRewardUsd = Math.round(pos.debtUsd * config.partialLiquidationPct * config.keeperBonus * 100) / 100;
  } else if (currentLtv >= config.warningLtv) {
    status = 'warning';
    action = 'SEND_WARNING';
  } else {
    status = 'healthy';
  }

  return {
    loanId: pos.loanId,
    walletAddress: pos.walletAddress,
    deviceType: pos.deviceType,
    currentLtv: Math.round(currentLtv * 10000) / 10000,
    healthFactor: Math.round(healthFactor * 100) / 100,
    status,
    collateralValueUsd: pos.collateralValueUsd,
    debtUsd: pos.debtUsd,
    liquidationPrice: Math.round(liquidationPrice * 100) / 100,
    distanceToLiquidation: Math.round(distanceToLiquidation * 100) / 100,
    action,
    keeperRewardUsd,
  };
}

// Demo positions for simulation
function getDemoPositions(): LoanPosition[] {
  return [
    { loanId: 'loan-001', walletAddress: '0xAbc...1234', deviceType: 'helium', collateralValueUsd: 4200, debtUsd: 2100, interestRate: 9.0, startTimestamp: '2025-01-15T00:00:00Z' },
    { loanId: 'loan-002', walletAddress: '0xDef...5678', deviceType: 'tesla', collateralValueUsd: 15000, debtUsd: 11500, interestRate: 6.0, startTimestamp: '2025-02-01T00:00:00Z' },
    { loanId: 'loan-003', walletAddress: '0xGhi...9012', deviceType: 'hivemapper', collateralValueUsd: 1800, debtUsd: 1500, interestRate: 8.0, startTimestamp: '2025-03-10T00:00:00Z' },
    { loanId: 'loan-004', walletAddress: '0xJkl...3456', deviceType: 'dimo', collateralValueUsd: 950, debtUsd: 350, interestRate: 8.0, startTimestamp: '2025-02-20T00:00:00Z' },
    { loanId: 'loan-005', walletAddress: '0xMno...7890', deviceType: 'weatherxm', collateralValueUsd: 600, debtUsd: 480, interestRate: 8.5, startTimestamp: '2025-01-05T00:00:00Z' },
    { loanId: 'loan-006', walletAddress: '0xPqr...2345', deviceType: 'ev_charger', collateralValueUsd: 5200, debtUsd: 3800, interestRate: 6.5, startTimestamp: '2025-03-01T00:00:00Z' },
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const view = url.searchParams.get('view');

    // GET thresholds config
    if (req.method === 'GET' && view === 'config') {
      return new Response(JSON.stringify({ thresholds: LIQUIDATION_CONFIG }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET: scan all demo positions
    if (req.method === 'GET') {
      const positions = getDemoPositions();
      const results = positions.map(assessPosition);
      const atRisk = results.filter(r => r.status !== 'healthy');
      const liquidatable = results.filter(r => r.status === 'liquidatable' || r.status === 'underwater');

      return new Response(JSON.stringify({
        totalPositions: results.length,
        healthyCount: results.filter(r => r.status === 'healthy').length,
        warningCount: results.filter(r => r.status === 'warning').length,
        liquidatableCount: liquidatable.length,
        totalKeeperRewards: Math.round(liquidatable.reduce((s, r) => s + (r.keeperRewardUsd ?? 0), 0) * 100) / 100,
        positions: results,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: assess custom positions
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const positions = Array.isArray(body) ? body : [body];
    
    // Validate each position
    for (const pos of positions) {
      if (!pos.loanId || !pos.walletAddress || !pos.deviceType || 
          typeof pos.collateralValueUsd !== 'number' || typeof pos.debtUsd !== 'number') {
        return new Response(JSON.stringify({ error: 'Each position requires: loanId, walletAddress, deviceType, collateralValueUsd (number), debtUsd (number)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (pos.collateralValueUsd <= 0) {
        return new Response(JSON.stringify({ error: `Invalid collateralValueUsd for loan ${pos.loanId}: must be > 0` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    const results = positions.map(assessPosition);

    return new Response(JSON.stringify({
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("liquidation-monitor error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
