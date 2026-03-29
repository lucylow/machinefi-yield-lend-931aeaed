import type { FunctionInvokeOptions } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errors';

function ensureSupabaseConfigured(): void {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || !url.trim() || typeof key !== 'string' || !key.trim()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment.'
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pickInvokeOptions(options: { method?: FunctionInvokeOptions['method']; body?: unknown }): FunctionInvokeOptions {
  const o: FunctionInvokeOptions = {};
  if (options.method) o.method = options.method;
  if (options.body !== undefined) {
    o.body = options.body as FunctionInvokeOptions['body'];
  }
  return o;
}

// Centralized error wrapper with retries for transient failures
async function invokeWithRetry<T>(
  fnName: string,
  options: { method?: FunctionInvokeOptions['method']; body?: unknown } = {},
  retries = 2
): Promise<T> {
  ensureSupabaseConfigured();
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(fnName, pickInvokeOptions(options));
      if (error) {
        const msg = error.message || 'Unknown edge function error';
        // Don't retry client errors (4xx)
        if (msg.includes('400') || msg.includes('404') || msg.includes('422')) {
          throw new Error(`${fnName}: ${msg}`);
        }
        throw new Error(msg);
      }
      if (data === null || data === undefined) {
        throw new Error(`${fnName}: empty response from edge function`);
      }
      return data as T;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(getErrorMessage(err));
      // Don't retry non-transient errors
      if (
        lastError.message.includes('400') ||
        lastError.message.includes('404') ||
        lastError.message.includes('422') ||
        lastError.message.includes('not configured')
      ) {
        throw lastError;
      }
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error(`${fnName}: request failed after retries`);
}

export interface DeviceYieldData {
  device: string;
  name: string;
  network: string;
  priceUsd: number;
  monthlyYieldUsd: number;
  annualYieldUsd?: number;
  apy: number;
  collateralValueUsd?: number;
  maxLtv?: number;
  liquidationThreshold?: number;
  timestamp: string;
}

export interface VerificationResult {
  verified: boolean;
  deviceId: string;
  ownerAddress: string;
  score: number;
  checks: { name: string; passed: boolean; detail: string }[];
  timestamp: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  walletAddress: string;
  loanId?: string;
  timestamp: string;
  read: boolean;
}

export interface PortfolioSummary {
  totalCollateralUsd: number;
  totalBorrowedUsd: number;
  netWorthUsd: number;
  healthFactor: number;
  averageLtv: number;
  deviceCount: number;
  monthlyYieldUsd: number;
  projectedAnnualYieldUsd: number;
}

// Yield Oracle
export async function fetchDeviceYield(device?: string): Promise<DeviceYieldData | DeviceYieldData[]> {
  const params = device ? `?device=${encodeURIComponent(device)}` : '';
  const data: unknown = await invokeWithRetry<unknown>(`yield-oracle${params}`, { method: 'GET' });
  if (device) {
    if (!isRecord(data)) throw new Error('yield-oracle: invalid device payload');
    return data as DeviceYieldData;
  }
  if (!isRecord(data) || !Array.isArray(data.devices)) {
    throw new Error('yield-oracle: missing devices array');
  }
  return data.devices as DeviceYieldData[];
}

// Hardware Verification
export async function verifyHardware(params: {
  deviceId: string;
  deviceType: string;
  ownerAddress: string;
  proofData?: Record<string, unknown>;
}): Promise<VerificationResult> {
  if (!params.deviceId || !params.deviceType || !params.ownerAddress) {
    throw new Error('verifyHardware requires deviceId, deviceType, and ownerAddress');
  }
  return invokeWithRetry<VerificationResult>('hardware-verification', { body: params });
}

// Loan Notifications
export async function getNotifications(wallet: string): Promise<Notification[]> {
  if (!wallet) throw new Error('getNotifications requires a wallet address');
  const q = encodeURIComponent(wallet);
  const data: unknown = await invokeWithRetry<unknown>(`loan-notifications?wallet=${q}`, { method: 'GET' });
  if (!isRecord(data) || !Array.isArray(data.notifications)) {
    throw new Error('loan-notifications: missing notifications array');
  }
  return data.notifications as Notification[];
}

export async function createNotification(params: {
  type: string;
  walletAddress: string;
  loanId?: string;
  data?: Record<string, unknown>;
}): Promise<Notification> {
  if (!params.type || !params.walletAddress) {
    throw new Error('createNotification requires type and walletAddress');
  }
  const data: unknown = await invokeWithRetry<unknown>('loan-notifications', { body: params });
  if (!isRecord(data) || !isRecord(data.notification)) {
    throw new Error('loan-notifications: missing notification object');
  }
  return data.notification as Notification;
}

// Portfolio Analytics
export async function fetchProtocolStats(): Promise<Record<string, unknown>> {
  const data: unknown = await invokeWithRetry<unknown>('portfolio-analytics?view=overview', { method: 'GET' });
  if (!isRecord(data)) throw new Error('portfolio-analytics: invalid overview response');
  return data;
}

export async function fetchPortfolio(wallet: string): Promise<Record<string, unknown>> {
  if (!wallet) throw new Error('fetchPortfolio requires a wallet address');
  const w = encodeURIComponent(wallet);
  const data: unknown = await invokeWithRetry<unknown>(`portfolio-analytics?view=portfolio&wallet=${w}`, { method: 'GET' });
  if (!isRecord(data)) throw new Error('portfolio-analytics: invalid portfolio response');
  return data;
}

export async function fetchTvlHistory(days = 30): Promise<unknown[]> {
  const data: unknown = await invokeWithRetry<unknown>(
    `portfolio-analytics?view=history&days=${encodeURIComponent(String(days))}`,
    { method: 'GET' }
  );
  if (!isRecord(data) || !Array.isArray(data.history)) {
    throw new Error('portfolio-analytics: missing history array');
  }
  return data.history;
}

// === AI Yield Prediction ===
export interface YieldPrediction {
  predictedMonthlyYield: number;
  predictedAnnualYield: number;
  confidenceScore: number;
  riskScore: number;
  yieldCurve: { month: number; predictedYield: number; lowerBound: number; upperBound: number }[];
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; weight: number; description: string }[];
  recommendedLtv: number;
  recommendedInterestRate: number;
}

export interface PredictYieldResponse {
  deviceType: string;
  deviceId: string | null;
  baseline: { name: string; avgMonthlyYield: number; volatility: number };
  prediction: YieldPrediction;
  timestamp: string;
}

export async function predictYield(params: {
  deviceType: string;
  deviceId?: string;
  historicalYields?: number[];
  horizonMonths?: number;
}): Promise<PredictYieldResponse> {
  if (!params.deviceType) throw new Error('predictYield requires deviceType');
  return invokeWithRetry<PredictYieldResponse>('predict-yield', { body: params });
}

// === Risk Engine ===
export interface RiskAssessment {
  deviceType: string;
  deviceId: string | null;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dynamicLtv: number;
  dynamicInterestRate: number;
  liquidationThreshold: number;
  healthFactor: number | null;
  breakdown: Record<string, { score: number; weight: number }>;
  recommendations: string[];
  timestamp: string;
}

export async function assessRisk(params: {
  deviceType: string;
  deviceId?: string;
  uptime?: number;
  ageMonths?: number;
  historicalYields?: number[];
  currentDebt?: number;
  collateralValue?: number;
}): Promise<RiskAssessment> {
  if (!params.deviceType) throw new Error('assessRisk requires deviceType');
  return invokeWithRetry<RiskAssessment>('risk-engine', { body: params });
}

export async function batchAssessRisk(devices: Array<{
  deviceType: string;
  deviceId?: string;
  uptime?: number;
  ageMonths?: number;
  historicalYields?: number[];
}>): Promise<{ results: RiskAssessment[]; timestamp: string }> {
  if (!devices.length) throw new Error('batchAssessRisk requires at least one device');
  return invokeWithRetry<{ results: RiskAssessment[]; timestamp: string }>('risk-engine', { body: devices });
}

export async function getRiskProfiles(): Promise<unknown[]> {
  const data: unknown = await invokeWithRetry<unknown>('risk-engine?view=profiles', { method: 'GET' });
  if (!isRecord(data) || !Array.isArray(data.profiles)) {
    throw new Error('risk-engine: missing profiles array');
  }
  return data.profiles;
}

// === Price Feed Oracle ===
export interface TokenPrice {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  currentPrice: number;
  change24h: number;
  volatility24h: number;
  network: string;
}

export interface DeviceCollateral {
  device: string;
  token: string;
  tokenSymbol: string;
  currentTokenPrice: number;
  hardwareValueUsd: number;
  tokenHoldings: number;
  tokenValueUsd: number;
  totalCollateralUsd: number;
  timestamp: string;
}

export async function fetchTokenPrices(): Promise<TokenPrice[]> {
  const data: unknown = await invokeWithRetry<unknown>('price-feed', { method: 'GET' });
  if (!isRecord(data) || !Array.isArray(data.prices)) {
    throw new Error('price-feed: missing prices array');
  }
  return data.prices as TokenPrice[];
}

export async function fetchTokenPrice(token: string): Promise<TokenPrice & { history?: { timestamp: string; price: number }[] }> {
  if (!token) throw new Error('fetchTokenPrice requires a token identifier');
  const t = encodeURIComponent(token);
  return invokeWithRetry<TokenPrice & { history?: { timestamp: string; price: number }[] }>(
    `price-feed?token=${t}&history=true`,
    { method: 'GET' }
  );
}

export async function fetchDeviceCollateral(device: string): Promise<DeviceCollateral> {
  if (!device) throw new Error('fetchDeviceCollateral requires a device identifier');
  const d = encodeURIComponent(device);
  return invokeWithRetry<DeviceCollateral>(`price-feed?device=${d}`, { method: 'GET' });
}

// === Liquidation Monitor ===
export interface LiquidationPosition {
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

export interface LiquidationScan {
  totalPositions: number;
  healthyCount: number;
  warningCount: number;
  liquidatableCount: number;
  totalKeeperRewards: number;
  positions: LiquidationPosition[];
  timestamp: string;
}

export async function scanLiquidations(): Promise<LiquidationScan> {
  return invokeWithRetry<LiquidationScan>('liquidation-monitor', { method: 'GET' });
}

export async function assessLiquidation(positions: {
  loanId: string;
  walletAddress: string;
  deviceType: string;
  collateralValueUsd: number;
  debtUsd: number;
  interestRate: number;
  startTimestamp: string;
}[]): Promise<{ results: LiquidationPosition[]; timestamp: string }> {
  if (!positions.length) throw new Error('assessLiquidation requires at least one position');
  return invokeWithRetry<{ results: LiquidationPosition[]; timestamp: string }>('liquidation-monitor', { body: positions });
}

// === Device Uptime Checker ===
export interface DeviceUptimeCheck {
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

export interface UptimeScanResult {
  totalDevices: number;
  onlineCount: number;
  offlineCount: number;
  avgUptimePct: number;
  degradedCount: number;
  devices: DeviceUptimeCheck[];
  timestamp: string;
}

export async function scanDeviceUptime(): Promise<UptimeScanResult> {
  return invokeWithRetry<UptimeScanResult>('device-uptime', { method: 'GET' });
}

export async function checkDeviceUptime(deviceType: string, deviceId: string): Promise<DeviceUptimeCheck> {
  if (!deviceType || !deviceId) throw new Error('checkDeviceUptime requires deviceType and deviceId');
  const dt = encodeURIComponent(deviceType);
  const id = encodeURIComponent(deviceId);
  return invokeWithRetry<DeviceUptimeCheck>(`device-uptime?device=${dt}&deviceId=${id}`, { method: 'GET' });
}

// === Loan Matching Engine ===
export interface PoolMatch {
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

export interface LoanMatchResult {
  request: { deviceType: string; collateralValueUsd: number; desiredLoanUsd: number };
  bestMatch: PoolMatch | null;
  allPools: PoolMatch[];
  timestamp: string;
}

export async function fetchLendingPools(): Promise<unknown[]> {
  const data: unknown = await invokeWithRetry<unknown>('loan-matching', { method: 'GET' });
  if (!isRecord(data) || !Array.isArray(data.pools)) {
    throw new Error('loan-matching: missing pools array');
  }
  return data.pools;
}

export async function matchLoan(params: {
  deviceType: string;
  collateralValueUsd: number;
  desiredLoanUsd: number;
  riskScore?: number;
}): Promise<LoanMatchResult> {
  if (!params.deviceType || !params.collateralValueUsd || !params.desiredLoanUsd) {
    throw new Error('matchLoan requires deviceType, collateralValueUsd, and desiredLoanUsd');
  }
  return invokeWithRetry<LoanMatchResult>('loan-matching', { body: params });
}
