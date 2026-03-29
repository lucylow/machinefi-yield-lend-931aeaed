import { describe, it, expect, beforeEach } from "vitest";
import { ProtocolSimulationEngine, createProtocolSimulationEngine } from "./protocolSimulationEngine";

describe("ProtocolSimulationEngine", () => {
  let engine: ProtocolSimulationEngine;

  beforeEach(() => {
    engine = createProtocolSimulationEngine({
      scenarioId: "healthy",
      seed: 42,
      volatility: "low",
      targetDeviceCount: 3,
    });
  });

  it("produces coherent positions with principal, interest, and health factor", () => {
    const positions = engine.getLoanPositions().filter((p) => p.status === "active");
    expect(positions.length).toBeGreaterThan(0);
    const p = positions[0];
    expect(p.principalUsd).toBeGreaterThan(0);
    expect(p.accruedInterestUsd).toBeGreaterThanOrEqual(0);
    expect(p.healthFactor).toBeGreaterThan(0);
    expect(Number.parseFloat(p.debt)).toBeCloseTo(p.principalUsd + p.accruedInterestUsd, 1);
  });

  it("accrues interest over ticks", () => {
    const before = engine.getLoanPositions().find((p) => p.nftId === 1)?.accruedInterestUsd ?? 0;
    for (let i = 0; i < 5; i++) engine.tick();
    const after = engine.getLoanPositions().find((p) => p.nftId === 1)?.accruedInterestUsd ?? 0;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("applyBorrow increases debt within LTV bounds", () => {
    const before = engine.getLoanPositions().find((p) => p.nftId === 1);
    const debt0 = before ? Number.parseFloat(before.debt) : 0;
    engine.applyBorrow(1, 50);
    const after = engine.getLoanPositions().find((p) => p.nftId === 1);
    expect(after).toBeTruthy();
    expect(Number.parseFloat(after!.debt)).toBeGreaterThan(debt0);
  });

  it("applyRepay clears an active loan", () => {
    engine.applyRepay(1, 0, true);
    const p = engine.getLoanPositions().find((x) => x.nftId === 1);
    expect(p).toBeUndefined();
  });

  it("registerDeviceFromDemo adds hardware", () => {
    const n0 = engine.getHardwareDevices().length;
    engine.registerDeviceFromDemo(0, "HLM-TEST-001");
    expect(engine.getHardwareDevices().length).toBe(n0 + 1);
  });
});
