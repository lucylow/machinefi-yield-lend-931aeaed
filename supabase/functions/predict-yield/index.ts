import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  extractToolCallArguments,
  lovableChatCompletion,
  parseJsonObject,
} from "../_shared/lovable-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const MAX_HISTORICAL_POINTS = 24;
const MIN_HORIZON = 1;
const MAX_HORIZON = 60;
const GATEWAY_TIMEOUT_MS = 52_000;

type Baseline = {
  name: string;
  avgMonthlyYield: number;
  volatility: number;
  networkGrowthRate: number;
  avgUptime: number;
};

const DEVICE_BASELINES: Record<string, Baseline> = {
  helium: { name: "Helium Hotspot", avgMonthlyYield: 45, volatility: 0.25, networkGrowthRate: 0.03, avgUptime: 0.92 },
  hivemapper: { name: "Hivemapper Dashcam", avgMonthlyYield: 80, volatility: 0.18, networkGrowthRate: 0.08, avgUptime: 0.88 },
  tesla: { name: "Tesla Vehicle (RWA)", avgMonthlyYield: 120, volatility: 0.12, networkGrowthRate: 0.05, avgUptime: 0.95 },
  weatherxm: { name: "WeatherXM Station", avgMonthlyYield: 30, volatility: 0.22, networkGrowthRate: 0.06, avgUptime: 0.90 },
  dimo: { name: "DIMO Vehicle Miner", avgMonthlyYield: 55, volatility: 0.20, networkGrowthRate: 0.04, avgUptime: 0.87 },
  ev_charger: { name: "EV Charger", avgMonthlyYield: 95, volatility: 0.15, networkGrowthRate: 0.10, avgUptime: 0.93 },
};

const YIELD_TOOL_NAME = "yield_prediction";

type YieldPrediction = {
  predictedMonthlyYield: number;
  predictedAnnualYield: number;
  confidenceScore: number;
  riskScore: number;
  yieldCurve: { month: number; predictedYield: number; lowerBound: number; upperBound: number }[];
  factors: { name: string; impact: "positive" | "negative" | "neutral"; weight: number; description: string }[];
  recommendedLtv: number;
  recommendedInterestRate: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sanitizeHistoricalYields(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const nums = raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return nums.slice(-MAX_HISTORICAL_POINTS);
}

function computeHeuristicPrediction(baseline: Baseline, horizonMonths: number): YieldPrediction {
  const monthlyYield = baseline.avgMonthlyYield * (1 + baseline.networkGrowthRate);
  const yieldCurve = Array.from({ length: horizonMonths }, (_, i) => {
    const decay = 1 - i * 0.005;
    const growth = 1 + baseline.networkGrowthRate * (i + 1);
    const predicted = monthlyYield * decay * growth;
    return {
      month: i + 1,
      predictedYield: round2(predicted),
      lowerBound: round2(predicted * (1 - baseline.volatility)),
      upperBound: round2(predicted * (1 + baseline.volatility)),
    };
  });
  const sumCurve = yieldCurve.reduce((s, p) => s + p.predictedYield, 0);
  return {
    predictedMonthlyYield: round2(monthlyYield),
    predictedAnnualYield: round2(sumCurve),
    confidenceScore: 65,
    riskScore: Math.round(baseline.volatility * 100),
    yieldCurve,
    factors: [
      {
        name: "Network Growth",
        impact: "positive",
        weight: 0.3,
        description: `Network expanding at ${(baseline.networkGrowthRate * 100).toFixed(1)}%/mo`,
      },
      { name: "Device Degradation", impact: "negative", weight: 0.15, description: "Hardware aging reduces efficiency over time" },
      { name: "Market Demand", impact: "neutral", weight: 0.25, description: "Baseline demand assumptions for this device class" },
    ],
    recommendedLtv: baseline.volatility < 0.15 ? 0.7 : baseline.volatility < 0.2 ? 0.55 : 0.4,
    recommendedInterestRate: Math.round(500 + baseline.volatility * 2000),
  };
}

function normalizeImpact(v: unknown): "positive" | "negative" | "neutral" {
  if (v === "positive" || v === "negative" || v === "neutral") return v;
  return "neutral";
}

function normalizePrediction(raw: Record<string, unknown>, baseline: Baseline, horizonMonths: number): YieldPrediction | null {
  const maxMonthly = baseline.avgMonthlyYield * 6;
  const monthly = Number(raw.predictedMonthlyYield);
  if (!Number.isFinite(monthly)) return null;

  let yieldCurve: YieldPrediction["yieldCurve"] = [];
  const rawCurve = raw.yieldCurve;
  if (Array.isArray(rawCurve)) {
    for (const row of rawCurve) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const m = Number(o.month);
      const py = Number(o.predictedYield);
      const lb = Number(o.lowerBound);
      const ub = Number(o.upperBound);
      if (![m, py, lb, ub].every(Number.isFinite)) continue;
      const pred = clamp(py, 0, maxMonthly);
      let lo = clamp(lb, 0, maxMonthly * 1.5);
      let hi = clamp(ub, 0, maxMonthly * 1.5);
      if (lo > pred) lo = pred;
      if (hi < pred) hi = pred;
      if (lo > hi) [lo, hi] = [hi, lo];
      yieldCurve.push({
        month: Math.round(m),
        predictedYield: round2(pred),
        lowerBound: round2(lo),
        upperBound: round2(hi),
      });
    }
  }

  yieldCurve.sort((a, b) => a.month - b.month);
  yieldCurve = yieldCurve.filter((p) => p.month >= 1 && p.month <= horizonMonths);
  if (yieldCurve.length !== horizonMonths) {
    const h = computeHeuristicPrediction(baseline, horizonMonths);
    yieldCurve = h.yieldCurve;
  } else {
    for (let i = 0; i < horizonMonths; i++) {
      if (yieldCurve[i].month !== i + 1) {
        const h = computeHeuristicPrediction(baseline, horizonMonths);
        yieldCurve = h.yieldCurve;
        break;
      }
    }
  }

  const sumMonths = yieldCurve.reduce((s, p) => s + p.predictedYield, 0);
  let annual = Number(raw.predictedAnnualYield);
  if (!Number.isFinite(annual)) annual = sumMonths;
  annual = clamp(annual, 0, maxMonthly * horizonMonths);
  const denom = Math.max(sumMonths, 1);
  if (Math.abs(annual - sumMonths) / denom > 0.2) {
    annual = sumMonths;
  }

  let factors: YieldPrediction["factors"] = [];
  const rawFactors = raw.factors;
  if (Array.isArray(rawFactors)) {
    for (const f of rawFactors.slice(0, 10)) {
      if (!f || typeof f !== "object") continue;
      const o = f as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.slice(0, 120) : "Factor";
      const desc = typeof o.description === "string" ? o.description.slice(0, 500) : "";
      const w = Number(o.weight);
      factors.push({
        name,
        impact: normalizeImpact(o.impact),
        weight: Number.isFinite(w) ? clamp(w, 0, 1) : 0.1,
        description: desc || name,
      });
    }
  }
  if (factors.length === 0) {
    factors = computeHeuristicPrediction(baseline, horizonMonths).factors;
  }

  const cRaw = Math.round(Number(raw.confidenceScore));
  const rRaw = Math.round(Number(raw.riskScore));
  const confidenceScore = Number.isFinite(cRaw) ? clamp(cRaw, 0, 100) : 65;
  const riskScore = Number.isFinite(rRaw) ? clamp(rRaw, 0, 100) : Math.round(baseline.volatility * 100);
  let recommendedLtv = Number(raw.recommendedLtv);
  if (!Number.isFinite(recommendedLtv)) recommendedLtv = 0.5;
  recommendedLtv = clamp(recommendedLtv, 0.2, 0.85);

  let recommendedInterestRate = Number(raw.recommendedInterestRate);
  if (!Number.isFinite(recommendedInterestRate)) recommendedInterestRate = 800;
  recommendedInterestRate = clamp(Math.round(recommendedInterestRate), 200, 5000);

  return {
    predictedMonthlyYield: round2(clamp(monthly, 0, maxMonthly)),
    predictedAnnualYield: round2(annual),
    confidenceScore,
    riskScore,
    yieldCurve,
    factors,
    recommendedLtv: round2(recommendedLtv),
    recommendedInterestRate,
  };
}

function yieldPredictionToolSchema() {
  return {
    type: "function" as const,
    function: {
      name: YIELD_TOOL_NAME,
      description: "Structured DePIN yield forecast: monthly/horizon totals, confidence bands, risk, and lending parameters",
      parameters: {
        type: "object",
        properties: {
          predictedMonthlyYield: { type: "number", description: "Expected average monthly yield in USD over the horizon" },
          predictedAnnualYield: {
            type: "number",
            description: "Sum of predicted monthly yields in USD over the full horizon (not extrapolated to calendar year unless horizon is 12)",
          },
          confidenceScore: { type: "number", description: "0-100 confidence in the forecast" },
          riskScore: { type: "number", description: "0-100 risk (100 = highest risk)" },
          yieldCurve: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "number", description: "1-based month index within horizon" },
                predictedYield: { type: "number" },
                lowerBound: { type: "number" },
                upperBound: { type: "number" },
              },
              required: ["month", "predictedYield", "lowerBound", "upperBound"],
            },
            description: `Exactly one entry per month for months 1..H where H is the prediction horizon`,
          },
          factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                impact: { type: "string", enum: ["positive", "negative", "neutral"] },
                weight: { type: "number" },
                description: { type: "string" },
              },
              required: ["name", "impact", "weight", "description"],
            },
          },
          recommendedLtv: { type: "number", description: "Suggested max LTV ratio 0-1 for lending against this collateral" },
          recommendedInterestRate: { type: "number", description: "Suggested annual interest rate in basis points" },
        },
        required: [
          "predictedMonthlyYield",
          "predictedAnnualYield",
          "confidenceScore",
          "riskScore",
          "yieldCurve",
          "factors",
          "recommendedLtv",
          "recommendedInterestRate",
        ],
        additionalProperties: false,
      },
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deviceType = typeof body.deviceType === "string" ? body.deviceType.trim() : "";
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : undefined;
    const historicalYields = sanitizeHistoricalYields(body.historicalYields);
    let horizonMonths = Number(body.horizonMonths);
    if (!Number.isFinite(horizonMonths)) horizonMonths = 12;
    horizonMonths = Math.round(clamp(horizonMonths, MIN_HORIZON, MAX_HORIZON));

    if (!deviceType || !DEVICE_BASELINES[deviceType]) {
      return new Response(
        JSON.stringify({ error: `Unknown device type. Supported: ${Object.keys(DEVICE_BASELINES).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseline = DEVICE_BASELINES[deviceType];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const model = (Deno.env.get("LOVABLE_AI_MODEL") || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

    const historicalContext = historicalYields.length
      ? `Recent monthly yields (USD), oldest→newest: ${historicalYields.map((y) => round2(y)).join(", ")}`
      : `No historical series provided; rely on baseline $${baseline.avgMonthlyYield}/mo and class volatility.`;

    const userPrompt = `DePIN yield forecast task.

Device class: ${baseline.name} (key: ${deviceType})
${deviceId ? `Device ID: ${deviceId}` : "Device ID: not provided"}
Baseline monthly yield: $${baseline.avgMonthlyYield}
Class volatility (σ): ${(baseline.volatility * 100).toFixed(1)}%
Network growth (assumed): ${(baseline.networkGrowthRate * 100).toFixed(1)}%/month
Typical uptime: ${(baseline.avgUptime * 100).toFixed(1)}%
${historicalContext}
Horizon: ${horizonMonths} months (yieldCurve MUST have exactly ${horizonMonths} rows with month = 1..${horizonMonths})

Consider: trend in historicals (if any), network saturation, token reward schedules, hardware decay, and macro demand.
Use the tool ${YIELD_TOOL_NAME} only; no free text.`;

    const requestBody: Record<string, unknown> = {
      model,
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content:
            "You are a quantitative DePIN lending analyst. Output must be a single tool call to yield_prediction. Numbers must be plausible for consumer/enterprise edge hardware rewards. If uncertain, stay near the provided baseline and reflect that in confidenceScore.",
        },
        { role: "user", content: userPrompt },
      ],
      tools: [yieldPredictionToolSchema()],
      tool_choice: { type: "function", function: { name: YIELD_TOOL_NAME } },
    };

    const gateway = await lovableChatCompletion(LOVABLE_API_KEY, requestBody, { timeoutMs: GATEWAY_TIMEOUT_MS });

    let prediction: YieldPrediction;

    if (!gateway.ok) {
      if (gateway.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (gateway.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (gateway.status === 401 || gateway.status === 403) {
        return new Response(
          JSON.stringify({ error: "AI gateway authentication failed. Verify LOVABLE_API_KEY for this project." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errSnippet = gateway.rawBody.slice(0, 500);
      console.error("AI gateway error:", gateway.status, errSnippet);
      prediction = computeHeuristicPrediction(baseline, horizonMonths);
    } else {
      const args = extractToolCallArguments(gateway.data, YIELD_TOOL_NAME);
      const parsed = args ? parseJsonObject(args) : null;
      const normalized = parsed ? normalizePrediction(parsed, baseline, horizonMonths) : null;
      prediction = normalized ?? computeHeuristicPrediction(baseline, horizonMonths);
    }

    return new Response(
      JSON.stringify({
        deviceType,
        deviceId: deviceId || null,
        baseline: { name: baseline.name, avgMonthlyYield: baseline.avgMonthlyYield, volatility: baseline.volatility },
        prediction,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAbort = error instanceof Error && (error.name === "AbortError" || message.includes("abort"));
    console.error("predict-yield error:", message);
    if (isAbort) {
      return new Response(JSON.stringify({ error: "AI request timed out. Try again with a shorter horizon." }), {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
