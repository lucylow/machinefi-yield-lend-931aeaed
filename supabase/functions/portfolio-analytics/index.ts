import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simulated protocol-wide and per-wallet analytics
const PROTOCOL_STATS = {
  tvl: 4200000,
  totalBorrowed: 2800000,
  totalCollateral: 5600000,
  activeLoans: 342,
  totalHardwareNFTs: 1280,
  averageApy: 8.2,
  utilizationRate: 66.7,
  protocolRevenue30d: 18600,
};

const DEVICE_BREAKDOWN = [
  { type: 'helium', count: 520, tvlShare: 28, avgYield: 45 },
  { type: 'hivemapper', count: 310, tvlShare: 22, avgYield: 80 },
  { type: 'tesla', count: 45, tvlShare: 35, avgYield: 120 },
  { type: 'weatherxm', count: 240, tvlShare: 8, avgYield: 30 },
  { type: 'dimo', count: 165, tvlShare: 7, avgYield: 55 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const wallet = url.searchParams.get('wallet');
    const view = url.searchParams.get('view') || 'overview';

    const addNoise = (value: number, pct: number) =>
      Math.round((value + value * pct * (Math.random() * 2 - 1)) * 100) / 100;

    const timestamp = new Date().toISOString();

    // Protocol-wide overview
    if (view === 'overview') {
      const stats = {
        tvl: addNoise(PROTOCOL_STATS.tvl, 0.02),
        totalBorrowed: addNoise(PROTOCOL_STATS.totalBorrowed, 0.03),
        totalCollateral: addNoise(PROTOCOL_STATS.totalCollateral, 0.02),
        activeLoans: PROTOCOL_STATS.activeLoans + Math.floor(Math.random() * 10 - 5),
        totalHardwareNFTs: PROTOCOL_STATS.totalHardwareNFTs + Math.floor(Math.random() * 20 - 10),
        averageApy: addNoise(PROTOCOL_STATS.averageApy, 0.05),
        utilizationRate: addNoise(PROTOCOL_STATS.utilizationRate, 0.02),
        protocolRevenue30d: addNoise(PROTOCOL_STATS.protocolRevenue30d, 0.1),
        deviceBreakdown: DEVICE_BREAKDOWN.map(d => ({
          ...d,
          count: d.count + Math.floor(Math.random() * 10 - 5),
          avgYield: addNoise(d.avgYield, 0.08),
        })),
        timestamp,
      };

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Per-wallet portfolio
    if (view === 'portfolio' && wallet) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return new Response(JSON.stringify({ error: 'Invalid wallet address' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate deterministic-ish portfolio based on wallet address
      const seed = parseInt(wallet.slice(2, 10), 16);
      const deviceCount = (seed % 5) + 1;
      const totalCollateral = addNoise(deviceCount * 800, 0.15);
      const totalBorrowed = addNoise(totalCollateral * 0.55, 0.1);
      const healthFactor = totalCollateral / (totalBorrowed || 1);

      const portfolio = {
        wallet,
        summary: {
          totalCollateralUsd: totalCollateral,
          totalBorrowedUsd: totalBorrowed,
          netWorthUsd: totalCollateral - totalBorrowed,
          healthFactor: Math.round(healthFactor * 100) / 100,
          averageLtv: Math.round((totalBorrowed / totalCollateral) * 10000) / 100,
          deviceCount,
          monthlyYieldUsd: addNoise(deviceCount * 55, 0.15),
          projectedAnnualYieldUsd: addNoise(deviceCount * 55 * 12, 0.15),
        },
        riskLevel: healthFactor > 2 ? 'low' : healthFactor > 1.5 ? 'medium' : healthFactor > 1.1 ? 'high' : 'critical',
        devices: Array.from({ length: deviceCount }, (_, i) => {
          const typeIdx = (seed + i) % DEVICE_BREAKDOWN.length;
          const device = DEVICE_BREAKDOWN[typeIdx];
          return {
            nftId: seed + i,
            type: device.type,
            collateralUsd: addNoise(device.avgYield * 12, 0.1),
            monthlyYieldUsd: addNoise(device.avgYield, 0.08),
            status: i === 0 ? 'active' : Math.random() > 0.3 ? 'active' : 'idle',
          };
        }),
        timestamp,
      };

      return new Response(JSON.stringify(portfolio), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Historical TVL data (for charts)
    if (view === 'history') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const cappedDays = Math.min(days, 90);
      const now = Date.now();
      const history = Array.from({ length: cappedDays }, (_, i) => {
        const date = new Date(now - (cappedDays - 1 - i) * 86400000);
        const progress = i / cappedDays;
        return {
          date: date.toISOString().split('T')[0],
          tvl: Math.round(PROTOCOL_STATS.tvl * (0.7 + progress * 0.3) + (Math.random() - 0.5) * 100000),
          totalBorrowed: Math.round(PROTOCOL_STATS.totalBorrowed * (0.6 + progress * 0.4) + (Math.random() - 0.5) * 50000),
          activeLoans: Math.round(PROTOCOL_STATS.activeLoans * (0.5 + progress * 0.5) + (Math.random() - 0.5) * 15),
        };
      });

      return new Response(JSON.stringify({ history, days: cappedDays, timestamp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid view. Use: overview, portfolio, history' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
