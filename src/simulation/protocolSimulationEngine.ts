import {
  BASE_INTEREST_RATE_BPS,
  LIQUIDATION_THRESHOLD_BPS,
  MAX_INITIAL_LTV_BPS,
} from "@/constants/addresses";
import type { MockVolatilityLevel } from "@/constants/mockConfig";
import { MOCK_VOLATILITY_LEVEL } from "@/constants/mockConfig";
import type { ProtocolAsset, ProtocolProof, RiskEvent, YieldHistoryPoint } from "@/types/protocol";
import type { HardwareDevice, LoanPosition } from "@/types/walletPortfolio";
import { healthFactorFromUsd } from "@/lib/healthFactor";
import { formatAprFromBps } from "@/lib/format";
import { mulberry32 } from "@/simulation/seededRandom";
import {
  DEMO_SCENARIOS,
  volatilityNoiseAmplitude,
  type DemoScenarioId,
  type ScenarioDeviceSeed,
  type ScenarioSeed,
} from "@/simulation/scenarios";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const STALE_PROOF_MS = 48 * 60 * 60 * 1000;
const DCF_MULTIPLIER = 2.35;

export interface ProtocolSimulationEngineConfig {
  scenarioId: DemoScenarioId;
  seed: number;
  volatility: MockVolatilityLevel;
  targetDeviceCount: number;
}

interface SimDevice {
  seed: ScenarioDeviceSeed;
  registrationTime: number;
  lastProofAt: number;
  uptimeBps: number;
  confidenceBps: number;
  yieldAprBps: number;
  yieldSmooth: number;
  outageUntil: number;
}

interface SimLoan {
  nftId: number;
  principalUsd: number;
  accruedInterestUsd: number;
  borrowAprBps: number;
  status: "active" | "repaid" | "liquidated";
  liquidateAt: number | null;
}

export type ProtocolDataSource = "real" | "cached" | "mock";

export interface ProtocolOverviewSlice {
  totalCollateralUsd: number;
  totalBorrowedUsd: number;
  activeDevices: number;
  liquidationThresholdBps: number;
  poolUtilizationBps: number;
  supplyApyBps: number;
  borrowApyBps: number;
  poolTotalLiquidityUsd: number;
}

export interface ProtocolSimulationSnapshot {
  source: ProtocolDataSource;
  overview: ProtocolOverviewSlice;
  borrowApyLabel: string;
  supplyApyLabel: string;
  alerts: RiskEvent[];
  yieldHistory: YieldHistoryPoint[];
  proofs: ProtocolProof[];
  riskEvents: RiskEvent[];
  primaryBorrowAsset: ProtocolAsset;
  simulationTimeMs: number;
  mockBlockNumber: number;
  scenarioId: DemoScenarioId;
}

function kindBaseUsd(kind: ScenarioDeviceSeed["kind"]): number {
  switch (kind) {
    case "helium":
      return 5200;
    case "hivemapper":
      return 6800;
    case "ev":
      return 8400;
    default:
      return 6000;
  }
}

function deviceCollateralUsd(d: SimDevice, now: number): number {
  const staleMult = now - d.lastProofAt > STALE_PROOF_MS ? 0.88 : 1;
  const outageMult = now < d.outageUntil ? 0.72 : 1;
  const aprNorm = d.yieldAprBps / 800;
  const base = kindBaseUsd(d.seed.kind);
  return (
    base *
    aprNorm *
    (d.uptimeBps / 10_000) *
    (d.confidenceBps / 10_000) *
    DCF_MULTIPLIER *
    staleMult *
    outageMult
  );
}

function loanTotalDebt(l: SimLoan): number {
  if (l.status !== "active") return 0;
  return l.principalUsd + l.accruedInterestUsd;
}

function apyFromUtilization(utilBps: number, reserveFactorBps: number): { supply: number; borrow: number } {
  const u = utilBps / 10_000;
  const borrow = Math.round(BASE_INTEREST_RATE_BPS + 400 * u * u + 180 * u);
  const supply = Math.round(borrow * u * (1 - reserveFactorBps / 10_000));
  return { supply: Math.max(0, supply), borrow: Math.max(BASE_INTEREST_RATE_BPS, borrow) };
}

export class ProtocolSimulationEngine {
  private rng: () => number;
  private listeners = new Set<() => void>();
  private scenario: ScenarioSeed;
  /** Mutable copy — never mutate `DEMO_SCENARIOS` shared objects. */
  private anchors: {
    totalCollateralUsd: number;
    totalBorrowedUsd: number;
    activeDevices: number;
  };
  private devices: Map<number, SimDevice> = new Map();
  private loans: Map<number, SimLoan> = new Map();
  private volatility: MockVolatilityLevel;
  private lastTickMs = Date.now();
  private simNowMs = Date.now();
  private yieldHistory: YieldHistoryPoint[] = [];
  private riskEvents: RiskEvent[] = [];
  private eventCounter = 0;
  private blockNumber = 18_942_100;
  private nextDeviceId: number;
  private _cachedSnapshot: ProtocolSimulationSnapshot | null = null;
  private _snapshotDirty = true;

  constructor(cfg: ProtocolSimulationEngineConfig) {
    this.scenario = DEMO_SCENARIOS[cfg.scenarioId];
    this.anchors = { ...this.scenario.overviewAnchors };
    this.volatility = cfg.volatility ?? MOCK_VOLATILITY_LEVEL;
    this.rng = mulberry32(cfg.seed || 0x9e3779b9);
    this.nextDeviceId =
      Math.max(0, ...this.scenario.devices.map((d) => d.id), ...this.scenario.loans.map((l) => l.nftId)) + 1;

    const now = Date.now();
    for (const d of this.scenario.devices) {
      this.devices.set(d.id, this.seedDevice(d, now));
    }
    for (const l of this.scenario.loans) {
      this.loans.set(l.nftId, { ...l, liquidateAt: null });
    }

    this.expandDevicesToCount(Math.max(this.devices.size, cfg.targetDeviceCount));

    this.bootstrapHistory();
    this.pushRisk("info", "Simulation online — shadow protocol book is deterministic for this session.");
  }

  resetScenario(scenarioId: DemoScenarioId, seed: number, volatility: MockVolatilityLevel, _targetDeviceCount: number) {
    this.scenario = DEMO_SCENARIOS[scenarioId];
    this.anchors = { ...this.scenario.overviewAnchors };
    this.volatility = volatility;
    this.rng = mulberry32(seed || 0x9e3779b9);
    this.devices = new Map();
    this.loans = new Map();
    const now = Date.now();
    for (const d of this.scenario.devices) {
      this.devices.set(d.id, this.seedDevice(d, now));
    }
    for (const l of this.scenario.loans) {
      this.loans.set(l.nftId, { ...l, liquidateAt: null });
    }
    this.nextDeviceId =
      Math.max(0, ...this.scenario.devices.map((d) => d.id), ...this.scenario.loans.map((l) => l.nftId)) + 1;
    this.expandDevicesToCount(Math.max(this.devices.size, _targetDeviceCount));
    this.yieldHistory = [];
    this.riskEvents = [];
    this.eventCounter = 0;
    this.bootstrapHistory();
    this.pushRisk("info", `Loaded scenario: ${this.scenario.label}`);
    this.notify();
  }

  private expandDevicesToCount(target: number) {
    const kinds: ScenarioDeviceSeed["kind"][] = ["helium", "hivemapper", "ev"];
    while (this.devices.size < target) {
      const id = this.nextDeviceId++;
      const kind = kinds[(id + this.scenario.id.length) % kinds.length];
      const seed: ScenarioDeviceSeed = {
        id,
        deviceId: `0xsynth${id.toString(16)}`,
        typeLabel:
          kind === "helium" ? "Helium Hotspot" : kind === "hivemapper" ? "Hivemapper Dashcam" : "EV Charger (DePIN)",
        kind,
        baseYieldAprBps: kind === "helium" ? 750 : kind === "hivemapper" ? 900 : 1150,
        uptimeBps: 9000 + Math.floor(this.rng() * 800),
        confidenceBps: 8600 + Math.floor(this.rng() * 900),
      };
      this.devices.set(id, this.seedDevice(seed, Date.now()));
    }
  }

  private seedDevice(d: ScenarioDeviceSeed, now: number): SimDevice {
    return {
      seed: d,
      registrationTime: now - 86400000 * 20 - Math.floor(this.rng() * 86400000 * 10),
      lastProofAt: now - Math.floor(this.rng() * 3_600_000),
      uptimeBps: d.uptimeBps,
      confidenceBps: d.confidenceBps,
      yieldAprBps: d.baseYieldAprBps,
      yieldSmooth: d.baseYieldAprBps,
      outageUntil: 0,
    };
  }

  private bootstrapHistory() {
    const base = this.anchors.totalCollateralUsd * 0.0095;
    const { borrow } = apyFromUtilization(6100, this.scenario.reserveFactorBps);
    this.yieldHistory = [
      { at: "2026-01-01", yieldUsd: base * 0.95, aprBps: borrow - 120 },
      { at: "2026-02-01", yieldUsd: base * 0.98, aprBps: borrow - 80 },
      { at: "2026-03-01", yieldUsd: base, aprBps: borrow - 40 },
    ];
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this._snapshotDirty = true;
    this._cachedSnapshot = null;
    this.listeners.forEach((fn) => fn());
  }

  private pushRisk(severity: RiskEvent["severity"], message: string) {
    this.eventCounter += 1;
    this.riskEvents.unshift({
      id: `sim-${this.eventCounter}`,
      at: new Date().toISOString(),
      severity,
      message,
    });
    this.riskEvents = this.riskEvents.slice(0, 12);
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(5_000, Math.max(0, now - this.lastTickMs));
    this.lastTickMs = now;
    this.simNowMs = now;
    this.blockNumber += Math.max(1, Math.floor(dt / 3000));

    const amp = volatilityNoiseAmplitude(this.volatility);
    const seasonal = Math.sin((Date.UTC(2026, 2, 29) % MS_PER_YEAR) / MS_PER_YEAR) * 0.02 * amp;

    for (const d of this.devices.values()) {
      const k = d.seed.kind;
      let noise = (this.rng() - 0.5) * 0.04 * amp;
      if (k === "hivemapper") noise *= 1.65;
      if (k === "ev") noise *= 2.1;
      if (k === "helium") noise *= 0.55;

      const targetApr = d.seed.baseYieldAprBps * (1 + noise + seasonal);
      d.yieldSmooth = d.yieldSmooth * 0.92 + targetApr * 0.08;
      d.yieldAprBps = Math.max(120, Math.min(2800, Math.round(d.yieldSmooth)));

      const uptimeDelta = (this.rng() - 0.5) * 80 * amp;
      d.uptimeBps = Math.max(4500, Math.min(9990, Math.round(d.uptimeBps + uptimeDelta)));

      const confDelta = (this.rng() - 0.5) * 60 * amp;
      d.confidenceBps = Math.max(5200, Math.min(9950, Math.round(d.confidenceBps + confDelta)));

      if (this.rng() < 0.0008 * amp && now > d.outageUntil) {
        d.outageUntil = now + 45_000 + Math.floor(this.rng() * 120_000);
        this.pushRisk("warning", `Brief telemetry gap on ${d.seed.typeLabel} — marks haircut until proofs refresh.`);
      }

      if (this.rng() < 0.0012) {
        d.lastProofAt = now - Math.floor(this.rng() * 7200_000);
      } else if (this.rng() < 0.004) {
        d.lastProofAt = now - Math.floor(this.rng() * 180_000);
      }
    }

    const yearFrac = dt / MS_PER_YEAR;
    for (const loan of this.loans.values()) {
      if (loan.status !== "active" || loan.principalUsd <= 0) continue;
      loan.accruedInterestUsd += loan.principalUsd * (loan.borrowAprBps / 10_000) * yearFrac;
    }

    for (const loan of this.loans.values()) {
      if (loan.status !== "active") continue;
      const dev = this.devices.get(loan.nftId);
      if (!dev) continue;
      const col = deviceCollateralUsd(dev, now);
      const debt = loanTotalDebt(loan);
      const hf = healthFactorFromUsd(col, debt, LIQUIDATION_THRESHOLD_BPS);
      if (hf < 1 && loan.liquidateAt === null) {
        loan.liquidateAt = now + 90_000;
        this.pushRisk("critical", `Position #${loan.nftId} crossed liquidation threshold — grace window active.`);
      }
      if (loan.liquidateAt !== null && now >= loan.liquidateAt) {
        loan.status = "liquidated";
        loan.principalUsd = 0;
        loan.accruedInterestUsd = 0;
        loan.liquidateAt = null;
        this.pushRisk("warning", `Simulated liquidation cleared NFT #${loan.nftId}.`);
      }
    }

    if (this.rng() < 0.002) {
      const y = this.anchors.totalCollateralUsd * (0.008 + this.rng() * 0.004);
      const { borrow } = apyFromUtilization(this.computeUtilizationBps(), this.scenario.reserveFactorBps);
      this.yieldHistory.push({
        at: new Date().toISOString().slice(0, 10),
        yieldUsd: Math.round(y),
        aprBps: borrow,
      });
      this.yieldHistory = this.yieldHistory.slice(-24);
    }

    this.notify();
  }

  private computeUtilizationBps(): number {
    const pool = this.scenario.poolLiquidityUsd;
    const borrowed =
      this.anchors.totalBorrowedUsd + [...this.loans.values()].reduce((s, l) => s + loanTotalDebt(l), 0) * 0.0001;
    const u = pool > 0 ? (borrowed / (pool + borrowed)) * 10_000 : 6200;
    return Math.max(1500, Math.min(9200, Math.round(u)));
  }

  private buildOverview(): ProtocolOverviewSlice {
    const now = this.simNowMs;
    const userCol = [...this.devices.values()].reduce((s, d) => s + deviceCollateralUsd(d, now), 0);
    const drift = 1 + Math.sin(now / 86_400_000) * 0.004;
    const totalCollateralUsd = Math.round(this.anchors.totalCollateralUsd * drift + userCol * 0.00015);
    const userDebt = [...this.loans.values()].reduce((s, l) => s + loanTotalDebt(l), 0);
    const totalBorrowedUsd = Math.round(this.anchors.totalBorrowedUsd * drift + userDebt * 0.00012);
    const util = this.computeUtilizationBps();
    const { supply, borrow } = apyFromUtilization(util, this.scenario.reserveFactorBps);
    return {
      totalCollateralUsd,
      totalBorrowedUsd,
      activeDevices: this.anchors.activeDevices + this.devices.size,
      liquidationThresholdBps: LIQUIDATION_THRESHOLD_BPS,
      poolUtilizationBps: util,
      supplyApyBps: supply,
      borrowApyBps: borrow,
      poolTotalLiquidityUsd: Math.round(this.scenario.poolLiquidityUsd * drift),
    };
  }

  private deviceToHardware(d: SimDevice): HardwareDevice {
    const now = this.simNowMs;
    const col = deviceCollateralUsd(d, now);
    const monthlyYield = (col * (d.yieldAprBps / 10_000)) / 12;
    const stale = now - d.lastProofAt > STALE_PROOF_MS;
    const simStatus = now < d.outageUntil ? "inactive" : stale ? "stale" : "active";
    return {
      id: d.seed.id,
      deviceId: d.seed.deviceId,
      type: d.seed.typeLabel,
      registrationTime: d.registrationTime,
      lastProofTimestamp: d.lastProofAt,
      isActive: simStatus === "active",
      monthlyYield: Math.round(monthlyYield * 100) / 100,
      yieldAprBps: d.yieldAprBps,
      uptimeBps: d.uptimeBps,
      confidenceBps: d.confidenceBps,
      simStatus,
    };
  }

  private loanToPosition(loan: SimLoan): LoanPosition | null {
    if (loan.status === "repaid") return null;
    const dev = this.devices.get(loan.nftId);
    if (!dev) return null;
    const now = this.simNowMs;
    const collateral = deviceCollateralUsd(dev, now);
    const debt = loanTotalDebt(loan);
    const ltv = collateral > 0 ? Math.min(99.9, (debt / collateral) * 100) : 0;
    const hf = healthFactorFromUsd(collateral, debt, LIQUIDATION_THRESHOLD_BPS);
    let healthLabel: LoanPosition["healthLabel"] = "safe";
    if (hf < 1.05) healthLabel = "critical";
    else if (hf < 1.15) healthLabel = "warning";
    const yieldPct = Math.min(95, Math.round((1 - ltv / 100) * 100));

    return {
      nftId: loan.nftId,
      debt: debt.toFixed(2),
      principalUsd: loan.principalUsd,
      accruedInterestUsd: Math.round(loan.accruedInterestUsd * 100) / 100,
      collateralValue: collateral.toFixed(2),
      ltv: Math.round(ltv * 10) / 10,
      yieldPercentage: yieldPct,
      deviceType: dev.seed.typeLabel,
      status: loan.status === "liquidated" ? "liquidated" : "active",
      healthFactor: hf,
      healthLabel,
      liquidationEligible: hf < 1 || (loan.liquidateAt !== null && now < loan.liquidateAt),
      borrowAprBps: loan.borrowAprBps,
      assetId: `asset-demo-${loan.nftId}`,
    };
  }

  private buildProofs(): ProtocolProof[] {
    return [...this.devices.values()].map((d) => {
      const stale = this.simNowMs - d.lastProofAt > STALE_PROOF_MS;
      return {
        proofId: `prf-${d.seed.id}-${Math.floor(d.lastProofAt / 1000)}`,
        deviceId: d.seed.deviceId,
        proofType: d.seed.kind === "helium" ? "uptime_attestation" : "telemetry_bundle",
        source: "opBNB indexer",
        timestamp: new Date(d.lastProofAt).toISOString(),
        verificationStatus: stale ? "pending" : "accepted",
        storageLocation: "greenfield://bucket/p/…",
        reference: `0x${(d.seed.id * 9973).toString(16)}…`,
        confidenceBps: stale ? Math.min(d.confidenceBps, 7200) : d.confidenceBps,
      };
    });
  }

  private primaryAsset(): ProtocolAsset {
    const first = [...this.devices.values()][0];
    if (!first) {
      return {
        id: "asset-demo-0",
        type: "hardware",
        owner: "0x0000…0000",
        class: "DePIN device",
        metadataUri: "ipfs://…/meta.json",
        valueUsd: 5000,
        yieldAprBps: 800,
        proofStatus: "accepted",
        lastProofAt: new Date().toISOString(),
        verificationStatus: "verified",
        collateralFactorBps: MAX_INITIAL_LTV_BPS,
        liquidationThresholdBps: LIQUIDATION_THRESHOLD_BPS,
        currentLtvBps: 0,
      };
    }
    const col = deviceCollateralUsd(first, this.simNowMs);
    const debtLoan = this.loans.get(first.seed.id);
    const debt = debtLoan && debtLoan.status === "active" ? loanTotalDebt(debtLoan) : 0;
    const ltvBps = col > 0 ? Math.round((debt / col) * 10_000) : 0;
    const stale = this.simNowMs - first.lastProofAt > STALE_PROOF_MS;
    return {
      id: `asset-demo-${first.seed.id}`,
      type: "hardware",
      owner: "0x0000…0000",
      class: first.seed.typeLabel,
      metadataUri: "ipfs://…/meta.json",
      valueUsd: Math.round(col),
      yieldAprBps: first.yieldAprBps,
      proofStatus: stale ? "pending" : "accepted",
      lastProofAt: new Date(first.lastProofAt).toISOString(),
      verificationStatus: stale ? "pending" : "verified",
      collateralFactorBps: MAX_INITIAL_LTV_BPS,
      liquidationThresholdBps: LIQUIDATION_THRESHOLD_BPS,
      currentLtvBps: Math.min(9800, ltvBps),
    };
  }

  getSnapshot(source: ProtocolDataSource = "mock"): ProtocolSimulationSnapshot {
    if (this._cachedSnapshot && !this._snapshotDirty) {
      return this._cachedSnapshot;
    }
    const overview = this.buildOverview();
    const { supply, borrow } = apyFromUtilization(overview.poolUtilizationBps, this.scenario.reserveFactorBps);
    const snap: ProtocolSimulationSnapshot = {
      source,
      overview: { ...overview, supplyApyBps: supply, borrowApyBps: borrow },
      borrowApyLabel: formatAprFromBps(borrow),
      supplyApyLabel: formatAprFromBps(supply),
      alerts: this.riskEvents.slice(0, 5),
      yieldHistory: [...this.yieldHistory],
      proofs: this.buildProofs(),
      riskEvents: [...this.riskEvents],
      primaryBorrowAsset: this.primaryAsset(),
      simulationTimeMs: this.simNowMs,
      mockBlockNumber: this.blockNumber,
      scenarioId: this.scenario.id,
    };
    this._cachedSnapshot = snap;
    this._snapshotDirty = false;
    return snap;
  }

  getHardwareDevices(): HardwareDevice[] {
    return [...this.devices.values()].map((d) => this.deviceToHardware(d)).sort((a, b) => a.id - b.id);
  }

  getLoanPositions(): LoanPosition[] {
    return [...this.loans.values()]
      .map((l) => this.loanToPosition(l))
      .filter((x): x is LoanPosition => x !== null);
  }

  registerDeviceFromDemo(deviceType: number, serialLabel: string) {
    const id = this.nextDeviceId++;
    const kind: ScenarioDeviceSeed["kind"] =
      deviceType === 0 ? "helium" : deviceType === 1 ? "hivemapper" : deviceType === 2 ? "ev" : "custom";
    const seed: ScenarioDeviceSeed = {
      id,
      deviceId: `0x${serialLabel.replace(/\W/g, "").slice(0, 12) || "newdev"}`,
      typeLabel:
        deviceType === 0
          ? "Helium Hotspot"
          : deviceType === 1
            ? "Hivemapper Dashcam"
            : deviceType === 2
              ? "EV Charger (DePIN)"
              : "DePIN Device",
      kind,
      baseYieldAprBps: kind === "helium" ? 760 : kind === "hivemapper" ? 950 : kind === "ev" ? 1200 : 850,
      uptimeBps: 9600,
      confidenceBps: 9200,
    };
    this.devices.set(id, this.seedDevice(seed, Date.now()));
    this.anchors.activeDevices += 1;
    this.pushRisk("info", `Registered ${seed.typeLabel} (#${id}) — oracle verification queued.`);
    this.notify();
  }

  refreshProof(tokenId: number) {
    const d = this.devices.get(tokenId);
    if (!d) return;
    d.lastProofAt = Date.now();
    d.confidenceBps = Math.min(9900, d.confidenceBps + 120);
    this.pushRisk("info", `Proof accepted for device #${tokenId}.`);
    this.notify();
  }

  applyBorrow(nftId: number, borrowAmountUsd: number) {
    const loan = this.loans.get(nftId);
    const dev = this.devices.get(nftId);
    if (!dev) return;
    const col = deviceCollateralUsd(dev, this.simNowMs);
    const add = borrowAmountUsd;
    const currentDebt = loan && loan.status === "active" ? loanTotalDebt(loan) : 0;
    const nextDebt = currentDebt + add;
    const maxDebt = (col * MAX_INITIAL_LTV_BPS) / 10_000;
    if (nextDebt > maxDebt * 1.002) {
      this.pushRisk("warning", "Borrow clamped to max LTV in simulation.");
    }
    const clamped = Math.min(nextDebt, maxDebt);
    const extraPrincipal = Math.max(0, clamped - currentDebt);
    if (extraPrincipal <= 0) return;

    if (loan && loan.status === "active") {
      loan.principalUsd += extraPrincipal;
    } else {
      this.loans.set(nftId, {
        nftId,
        principalUsd: extraPrincipal,
        accruedInterestUsd: 0,
        borrowAprBps: BASE_INTEREST_RATE_BPS + 120 + Math.floor(this.rng() * 80),
        status: "active",
        liquidateAt: null,
      });
    }
    this.anchors.totalBorrowedUsd += Math.round(extraPrincipal * 40);
    this.notify();
  }

  applyRepay(nftId: number, amountUsd: number, full: boolean) {
    const loan = this.loans.get(nftId);
    if (!loan || loan.status !== "active") return;
    let pay = full ? loanTotalDebt(loan) : Math.min(amountUsd, loanTotalDebt(loan));
    if (pay <= 0) return;

    if (loan.accruedInterestUsd >= pay) {
      loan.accruedInterestUsd -= pay;
      pay = 0;
    } else {
      pay -= loan.accruedInterestUsd;
      loan.accruedInterestUsd = 0;
      loan.principalUsd = Math.max(0, loan.principalUsd - pay);
    }

    if (loan.principalUsd < 0.01 && loan.accruedInterestUsd < 0.01) {
      loan.status = "repaid";
      loan.principalUsd = 0;
      loan.accruedInterestUsd = 0;
    }
    this.notify();
  }

  applyLiquidate(nftId: number) {
    const loan = this.loans.get(nftId);
    if (!loan || loan.status !== "active") return;
    loan.status = "liquidated";
    loan.principalUsd = 0;
    loan.accruedInterestUsd = 0;
    loan.liquidateAt = null;
    this.pushRisk("warning", `Liquidation executed on NFT #${nftId} (simulation).`);
    this.notify();
  }
}

let globalEngine: ProtocolSimulationEngine | null = null;

export function createProtocolSimulationEngine(cfg: ProtocolSimulationEngineConfig): ProtocolSimulationEngine {
  globalEngine = new ProtocolSimulationEngine(cfg);
  return globalEngine;
}

export function getProtocolSimulationEngine(): ProtocolSimulationEngine | null {
  return globalEngine;
}
