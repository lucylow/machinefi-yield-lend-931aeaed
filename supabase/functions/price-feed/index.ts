import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simulated real-time price feeds for DePIN tokens
// In production, these would pull from CoinGecko, CoinMarketCap, or on-chain DEX oracles
const BASE_PRICES: Record<string, { symbol: string; name: string; priceUsd: number; volatility24h: number; network: string }> = {
  hnt: { symbol: 'HNT', name: 'Helium', priceUsd: 7.42, volatility24h: 0.035, network: 'solana' },
  honey: { symbol: 'HONEY', name: 'Hivemapper', priceUsd: 0.082, volatility24h: 0.055, network: 'solana' },
  dimo: { symbol: 'DIMO', name: 'DIMO', priceUsd: 0.31, volatility24h: 0.042, network: 'polygon' },
  wxm: { symbol: 'WXM', name: 'WeatherXM', priceUsd: 0.45, volatility24h: 0.048, network: 'ethereum' },
  iot: { symbol: 'IOT', name: 'Helium IoT', priceUsd: 0.0032, volatility24h: 0.06, network: 'solana' },
  mobile: { symbol: 'MOBILE', name: 'Helium Mobile', priceUsd: 0.0008, volatility24h: 0.07, network: 'solana' },
};

// Hardware device → token mapping for collateral valuation
const DEVICE_TOKEN_MAP: Record<string, { token: string; unitsPerDevice: number; hardwareValueUsd: number }> = {
  helium: { token: 'hnt', unitsPerDevice: 500, hardwareValueUsd: 450 },
  hivemapper: { token: 'honey', unitsPerDevice: 12000, hardwareValueUsd: 549 },
  dimo: { token: 'dimo', unitsPerDevice: 2000, hardwareValueUsd: 300 },
  weatherxm: { token: 'wxm', unitsPerDevice: 800, hardwareValueUsd: 299 },
  tesla: { token: 'hnt', unitsPerDevice: 0, hardwareValueUsd: 12000 },
  ev_charger: { token: 'hnt', unitsPerDevice: 0, hardwareValueUsd: 2500 },
};

function simulatePrice(base: number, volatility: number): number {
  const noise = (Math.random() - 0.5) * 2 * volatility;
  return Math.round((base * (1 + noise)) * 10000) / 10000;
}

function get24hHistory(base: number, volatility: number, points = 24) {
  const history: { timestamp: string; price: number }[] = [];
  let price = base;
  const now = Date.now();
  for (let i = points; i >= 0; i--) {
    const noise = (Math.random() - 0.5) * 2 * volatility * 0.5;
    price = Math.max(base * 0.7, Math.min(base * 1.3, price * (1 + noise)));
    history.push({
      timestamp: new Date(now - i * 3600000).toISOString(),
      price: Math.round(price * 10000) / 10000,
    });
  }
  return history;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const device = url.searchParams.get('device');
    const includeHistory = url.searchParams.get('history') === 'true';

    // Single token price
    if (token) {
      const base = BASE_PRICES[token.toLowerCase()];
      if (!base) {
        return new Response(JSON.stringify({ error: `Unknown token: ${token}` }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const currentPrice = simulatePrice(base.priceUsd, base.volatility24h);
      const change24h = ((currentPrice - base.priceUsd) / base.priceUsd) * 100;
      const result: Record<string, unknown> = {
        ...base,
        currentPrice,
        change24h: Math.round(change24h * 100) / 100,
        marketCap: Math.round(currentPrice * 1_000_000_000),
        timestamp: new Date().toISOString(),
      };
      if (includeHistory) {
        result.history = get24hHistory(base.priceUsd, base.volatility24h);
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Device collateral valuation
    if (device) {
      const mapping = DEVICE_TOKEN_MAP[device.toLowerCase()];
      if (!mapping) {
        return new Response(JSON.stringify({ error: `Unknown device: ${device}` }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const tokenInfo = BASE_PRICES[mapping.token];
      const currentPrice = tokenInfo ? simulatePrice(tokenInfo.priceUsd, tokenInfo.volatility24h) : 0;
      const tokenValue = mapping.unitsPerDevice * currentPrice;
      const totalCollateral = mapping.hardwareValueUsd + tokenValue;

      return new Response(JSON.stringify({
        device: device.toLowerCase(),
        token: mapping.token,
        tokenSymbol: tokenInfo?.symbol ?? 'N/A',
        currentTokenPrice: currentPrice,
        hardwareValueUsd: mapping.hardwareValueUsd,
        tokenHoldings: mapping.unitsPerDevice,
        tokenValueUsd: Math.round(tokenValue * 100) / 100,
        totalCollateralUsd: Math.round(totalCollateral * 100) / 100,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All prices
    const allPrices = Object.entries(BASE_PRICES).map(([key, base]) => {
      const currentPrice = simulatePrice(base.priceUsd, base.volatility24h);
      const change24h = ((currentPrice - base.priceUsd) / base.priceUsd) * 100;
      return {
        id: key,
        ...base,
        currentPrice,
        change24h: Math.round(change24h * 100) / 100,
      };
    });

    return new Response(JSON.stringify({
      prices: allPrices,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("price-feed error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
