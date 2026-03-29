import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simulated DePIN device yield and price data
const DEVICE_DATA: Record<string, { name: string; monthlyYieldUsd: number; priceUsd: number; apy: number; network: string }> = {
  helium: {
    name: "Helium Hotspot",
    monthlyYieldUsd: 45,
    priceUsd: 500,
    apy: 10.8,
    network: "Helium IoT",
  },
  hivemapper: {
    name: "Hivemapper Dashcam",
    monthlyYieldUsd: 80,
    priceUsd: 650,
    apy: 14.8,
    network: "Hivemapper",
  },
  tesla: {
    name: "Tesla Vehicle (RWA)",
    monthlyYieldUsd: 120,
    priceUsd: 35000,
    apy: 4.1,
    network: "MachineFi RWA",
  },
  weatherxm: {
    name: "WeatherXM Station",
    monthlyYieldUsd: 30,
    priceUsd: 300,
    apy: 12.0,
    network: "WeatherXM",
  },
  dimo: {
    name: "DIMO Vehicle Miner",
    monthlyYieldUsd: 55,
    priceUsd: 800,
    apy: 8.3,
    network: "DIMO",
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const deviceType = url.searchParams.get('device');

    // Add realistic noise to simulate live oracle data
    const addNoise = (value: number, pct: number) => {
      const noise = value * pct * (Math.random() * 2 - 1);
      return Math.round((value + noise) * 100) / 100;
    };

    const timestamp = new Date().toISOString();

    if (deviceType && DEVICE_DATA[deviceType]) {
      const d = DEVICE_DATA[deviceType];
      const result = {
        device: deviceType,
        name: d.name,
        network: d.network,
        priceUsd: addNoise(d.priceUsd, 0.03),
        monthlyYieldUsd: addNoise(d.monthlyYieldUsd, 0.08),
        annualYieldUsd: addNoise(d.monthlyYieldUsd * 12, 0.08),
        apy: addNoise(d.apy, 0.05),
        collateralValueUsd: addNoise(d.monthlyYieldUsd * 12, 0.08),
        maxLtv: 0.65,
        liquidationThreshold: 0.80,
        timestamp,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return all devices
    const allDevices = Object.entries(DEVICE_DATA).map(([key, d]) => ({
      device: key,
      name: d.name,
      network: d.network,
      priceUsd: addNoise(d.priceUsd, 0.03),
      monthlyYieldUsd: addNoise(d.monthlyYieldUsd, 0.08),
      apy: addNoise(d.apy, 0.05),
      timestamp,
    }));

    return new Response(JSON.stringify({ devices: allDevices, timestamp }), {
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
