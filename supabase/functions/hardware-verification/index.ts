import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerificationRequest {
  deviceId: string;
  deviceType: string;
  ownerAddress: string;
  proofData?: {
    serialNumber?: string;
    firmwareVersion?: string;
    lastPingTimestamp?: number;
    geolocation?: { lat: number; lng: number };
  };
}

interface VerificationResult {
  verified: boolean;
  deviceId: string;
  ownerAddress: string;
  score: number;
  checks: { name: string; passed: boolean; detail: string }[];
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: VerificationRequest = await req.json();
    const { deviceId, deviceType, ownerAddress, proofData } = body;

    if (!deviceId || !deviceType || !ownerAddress) {
      return new Response(JSON.stringify({ error: 'Missing required fields: deviceId, deviceType, ownerAddress' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Run verification checks
    const checks: VerificationResult['checks'] = [];

    // 1. Address format check
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(ownerAddress);
    checks.push({
      name: 'address_format',
      passed: isValidAddress,
      detail: isValidAddress ? 'Valid EVM address' : 'Invalid address format',
    });

    // 2. Device type check
    const validTypes = ['helium', 'hivemapper', 'tesla', 'weatherxm', 'dimo'];
    const isValidType = validTypes.includes(deviceType.toLowerCase());
    checks.push({
      name: 'device_type',
      passed: isValidType,
      detail: isValidType ? `Recognized device type: ${deviceType}` : `Unknown device type: ${deviceType}`,
    });

    // 3. Serial number check
    const hasSerial = !!proofData?.serialNumber && proofData.serialNumber.length >= 6;
    checks.push({
      name: 'serial_number',
      passed: hasSerial,
      detail: hasSerial ? 'Serial number verified' : 'Missing or invalid serial number',
    });

    // 4. Firmware version check
    const hasFirmware = !!proofData?.firmwareVersion;
    checks.push({
      name: 'firmware_version',
      passed: hasFirmware,
      detail: hasFirmware ? `Firmware: ${proofData!.firmwareVersion}` : 'Firmware version not provided',
    });

    // 5. Recent activity check
    const now = Date.now();
    const lastPing = proofData?.lastPingTimestamp || 0;
    const isRecent = lastPing > 0 && (now - lastPing) < 86400000; // within 24h
    checks.push({
      name: 'recent_activity',
      passed: isRecent,
      detail: isRecent ? 'Device active within 24h' : 'No recent activity detected',
    });

    // 6. Geolocation check
    const hasGeo = !!proofData?.geolocation && 
      Math.abs(proofData.geolocation.lat) <= 90 && 
      Math.abs(proofData.geolocation.lng) <= 180;
    checks.push({
      name: 'geolocation',
      passed: hasGeo,
      detail: hasGeo ? 'Valid geolocation data' : 'Geolocation not provided or invalid',
    });

    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);
    const verified = score >= 67; // At least 4 of 6 checks must pass

    const result: VerificationResult = {
      verified,
      deviceId,
      ownerAddress,
      score,
      checks,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
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
