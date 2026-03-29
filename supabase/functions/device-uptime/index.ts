import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simulated device network endpoints and expected behavior
const DEVICE_NETWORKS: Record<string, {
  networkName: string;
  expectedPingMs: number;
  expectedUptimePct: number;
  checkEndpoint: string;
}> = {
  helium: { networkName: 'Helium Network', expectedPingMs: 200, expectedUptimePct: 92, checkEndpoint: 'api.helium.io/v1/hotspots' },
  hivemapper: { networkName: 'Hivemapper Network', expectedPingMs: 150, expectedUptimePct: 88, checkEndpoint: 'api.hivemapper.com/v1/devices' },
  tesla: { networkName: 'Tesla Energy', expectedPingMs: 100, expectedUptimePct: 97, checkEndpoint: 'owner-api.teslamotors.com/api/1/energy' },
  weatherxm: { networkName: 'WeatherXM Network', expectedPingMs: 250, expectedUptimePct: 85, checkEndpoint: 'api.weatherxm.com/api/v1/devices' },
  dimo: { networkName: 'DIMO Network', expectedPingMs: 180, expectedUptimePct: 90, checkEndpoint: 'api.dimo.zone/v1/vehicles' },
  ev_charger: { networkName: 'EV Charging Network', expectedPingMs: 120, expectedUptimePct: 94, checkEndpoint: 'api.evcharger.io/v1/stations' },
};

interface UptimeCheck {
  deviceType: string;
  deviceId: string;
  isOnline: boolean;
  latencyMs: number;
  uptimePct: number;
  lastSeen: string;
  consecutiveFailures: number;
  dataQualityScore: number;
  networkStatus: 'healthy' | 'degraded' | 'offline';
  alerts: string[];
}

function simulateUptimeCheck(deviceType: string, deviceId: string): UptimeCheck {
  const network = DEVICE_NETWORKS[deviceType];
  if (!network) throw new Error(`Unknown device type: ${deviceType}`);

  // Simulate realistic uptime behavior
  const rand = Math.random();
  const isOnline = rand > 0.08; // ~92% chance online
  const latencyMs = isOnline
    ? Math.round(network.expectedPingMs * (0.5 + Math.random()))
    : 0;

  const uptimeBase = network.expectedUptimePct;
  const uptimeNoise = (Math.random() - 0.5) * 8;
  const uptimePct = Math.max(50, Math.min(100, Math.round((uptimeBase + uptimeNoise) * 10) / 10));

  const consecutiveFailures = isOnline ? 0 : Math.floor(Math.random() * 5) + 1;

  // Data quality: how good is the data the device produces
  const dataQualityScore = isOnline
    ? Math.round((0.7 + Math.random() * 0.3) * 100) / 100
    : 0;

  let networkStatus: UptimeCheck['networkStatus'];
  if (!isOnline) networkStatus = 'offline';
  else if (latencyMs > network.expectedPingMs * 2 || uptimePct < 80) networkStatus = 'degraded';
  else networkStatus = 'healthy';

  const alerts: string[] = [];
  if (!isOnline) alerts.push('Device is currently offline');
  if (consecutiveFailures >= 3) alerts.push(`${consecutiveFailures} consecutive ping failures detected`);
  if (latencyMs > network.expectedPingMs * 2) alerts.push('Latency is above expected threshold');
  if (uptimePct < 80) alerts.push('30-day uptime below 80% — risk score will increase');
  if (dataQualityScore < 0.8 && isOnline) alerts.push('Data quality below optimal — check sensor calibration');

  const lastSeenOffset = isOnline ? Math.floor(Math.random() * 300) : Math.floor(Math.random() * 86400) + 3600;

  return {
    deviceType,
    deviceId,
    isOnline,
    latencyMs,
    uptimePct,
    lastSeen: new Date(Date.now() - lastSeenOffset * 1000).toISOString(),
    consecutiveFailures,
    dataQualityScore,
    networkStatus,
    alerts,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const deviceType = url.searchParams.get('device');
    const deviceId = url.searchParams.get('deviceId');

    // GET: check specific device or all demo devices
    if (req.method === 'GET') {
      if (deviceType && deviceId) {
        const check = simulateUptimeCheck(deviceType, deviceId);
        return new Response(JSON.stringify(check), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check all device types with demo IDs
      const checks = Object.keys(DEVICE_NETWORKS).map(dt =>
        simulateUptimeCheck(dt, `demo-${dt}-001`)
      );
      const onlineCount = checks.filter(c => c.isOnline).length;
      const avgUptime = Math.round(checks.reduce((s, c) => s + c.uptimePct, 0) / checks.length * 10) / 10;
      const degradedDevices = checks.filter(c => c.networkStatus !== 'healthy');

      return new Response(JSON.stringify({
        totalDevices: checks.length,
        onlineCount,
        offlineCount: checks.length - onlineCount,
        avgUptimePct: avgUptime,
        degradedCount: degradedDevices.length,
        devices: checks,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: batch check custom devices
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Array.isArray(body) || body.length === 0) {
      return new Response(JSON.stringify({ error: 'Body must be a non-empty array of { deviceType, deviceId }' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    for (const d of body) {
      if (!d.deviceType || !d.deviceId) {
        return new Response(JSON.stringify({ error: 'Each item requires deviceType and deviceId' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!DEVICE_NETWORKS[d.deviceType]) {
        return new Response(JSON.stringify({ error: `Unknown device type: ${d.deviceType}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    const results = body.map((d: { deviceType: string; deviceId: string }) => simulateUptimeCheck(d.deviceType, d.deviceId));

    return new Response(JSON.stringify({
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("device-uptime error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
