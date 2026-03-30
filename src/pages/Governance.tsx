import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/Layout/PageHeader";
import { AppPage } from "@/components/Layout/AppPage";
import { MOCK_FEE_GOVERNANCE, MOCK_GOVERNANCE_PROPOSALS } from "@/constants/mockProtocol";
import { InfoRow } from "@/components/protocol/InfoRow";
import { EmptyStateCard } from "@/components/protocol/EmptyStateCard";
import { formatRelativeIso, formatBpsAsPercent } from "@/lib/format";
import { DEVICE_CLASS_PROFILES, type DeviceClassKey } from "@/constants/deviceFees";
import { Link } from "react-router-dom";

const CLASS_ORDER: DeviceClassKey[] = ["helium", "hivemapper", "tesla", "custom"];

const Governance = () => {
  const active = MOCK_GOVERNANCE_PROPOSALS.filter((p) => p.executionStatus !== "executed");
  const fg = MOCK_FEE_GOVERNANCE;

  return (
    <AppPage className="min-h-[75vh]">
      <PageHeader
        eyebrow="Governance"
        title="Protocol governance"
        description="Risk parameters, fee schedules, treasury allocation, and upgrades flow through quorum-weighted votes. Governance can tune monetization within safe bounds — never custodian-withdraw user collateral from core lending."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
              <Link to="/protocol/revenue">Revenue dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
              <Link to="/protocol/tokenomics">Tokenomics (§13)</Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 w-full sm:w-auto mb-6">
          <TabsTrigger value="proposals" className="rounded-lg data-[state=active]:bg-card">
            Proposals
          </TabsTrigger>
          <TabsTrigger value="fees" className="rounded-lg data-[state=active]:bg-card">
            Fee policy
          </TabsTrigger>
          <TabsTrigger value="control" className="rounded-lg data-[state=active]:bg-card">
            Control surface
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="outline-none space-y-6 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Global fee routing</CardTitle>
                <p className="text-xs text-muted-foreground">
                  After fees hit `RevenueRouter`, proceeds split deterministically (bps). Updated {formatRelativeIso(fg.lastUpdated)}.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Liquidity providers" value={formatBpsAsPercent(fg.globalFeeRouting.liquidityProvidersBps, 1)} />
                <InfoRow label="Treasury" value={formatBpsAsPercent(fg.globalFeeRouting.treasuryBps, 1)} />
                <InfoRow label="MACH stakers" value={formatBpsAsPercent(fg.globalFeeRouting.machStakersBps, 1)} />
                <InfoRow label="Insurance reserve" value={formatBpsAsPercent(fg.globalFeeRouting.insuranceReserveBps, 1)} />
                <InfoRow label="Growth fund" value={formatBpsAsPercent(fg.globalFeeRouting.growthFundBps, 1)} />
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Treasury buckets</CardTitle>
                <p className="text-xs text-muted-foreground">Sub-allocation of the treasury share for reporting.</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Protocol revenue" value={formatBpsAsPercent(fg.treasuryBucketsBps.protocolRevenue, 1)} />
                <InfoRow label="Reserve capital" value={formatBpsAsPercent(fg.treasuryBucketsBps.reserveCapital, 1)} />
                <InfoRow label="Operational" value={formatBpsAsPercent(fg.treasuryBucketsBps.operational, 1)} />
                <InfoRow label="Incentives" value={formatBpsAsPercent(fg.treasuryBucketsBps.incentives, 1)} />
                <InfoRow label="Insurance backstop" value={formatBpsAsPercent(fg.treasuryBucketsBps.insuranceBackstop, 1)} />
              </CardContent>
            </Card>
          </div>
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base font-display">Device-class knobs (on-chain)</CardTitle>
              <p className="text-sm text-muted-foreground">
                `LendingPool.setClassFees` per `HardwareNFT.DeviceType`. Partner API pricing and premium tiers are governed separately (see revenue page).
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border/60">
                    <th className="pb-2 pr-3">Class</th>
                    <th className="pb-2 pr-3">Orig.</th>
                    <th className="pb-2 pr-3">Verify</th>
                    <th className="pb-2 pr-3">Borrow</th>
                    <th className="pb-2 pr-3">Lender</th>
                    <th className="pb-2">Liq.</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASS_ORDER.map((k) => {
                    const p = DEVICE_CLASS_PROFILES[k];
                    return (
                      <tr key={k} className="border-b border-border/40 last:border-0">
                        <td className="py-2 pr-3 font-medium">{p.label}</td>
                        <td className="py-2 pr-3 tabular-nums">{p.originationFeeBps}</td>
                        <td className="py-2 pr-3 tabular-nums">{p.verificationFeeBps}</td>
                        <td className="py-2 pr-3 tabular-nums">{p.borrowerAprBps}</td>
                        <td className="py-2 pr-3 tabular-nums">{p.lenderAprBps}</td>
                        <td className="py-2 tabular-nums">{p.liquidationFeeBps}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control" className="outline-none space-y-6 mb-10">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base font-display">On-chain authority graph (§14)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Wallet wiring is optional; this is the real control surface the app and auditors should index.
              </p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="text-foreground font-medium">Voting layer:</span> MACH (<code className="text-xs">ERC20Votes</code>) →{" "}
                  <code className="text-xs">MachineFiGovernor</code> (quorum fraction, proposal threshold, OZ lifecycle).
                </li>
                <li>
                  <span className="text-foreground font-medium">Execution layer:</span>{" "}
                  <code className="text-xs">MachineFiTimelock</code> (OZ timelock delay) is the executor; proposals queue then execute
                  with calldata to trusted module contracts only when the governor allowlist is enforced.
                </li>
                <li>
                  <span className="text-foreground font-medium">Settlement module:</span>{" "}
                  <code className="text-xs">LendingPool</code> — <code className="text-xs">GOVERNOR_ROLE</code> for oracle pointer, compliance hook,
                  LTV cap, class registry, revenue router, risk mode, oracle-update pause; <code className="text-xs">PAUSER_ROLE</code> for global pause
                  (new borrows / liquidations / oracle pushes blocked; repay is not gated by <code className="text-xs">whenNotPaused</code>).
                </li>
                <li>
                  <span className="text-foreground font-medium">Oracle module:</span>{" "}
                  <code className="text-xs">OracleManager</code> — <code className="text-xs">GOVERNOR_ROLE</code> for whitelist and consensus policy;{" "}
                  <code className="text-xs">GUARDIAN_ROLE</code> may trip the circuit breaker; governance resets it.
                </li>
                <li>
                  <span className="text-foreground font-medium">Class / risk mirror:</span>{" "}
                  <code className="text-xs">DePINClassRegistry</code> + <code className="text-xs">ProtocolParameterRegistry</code> — bounded keys and events
                  for BSC / opBNB / Greenfield-oriented parameters.
                </li>
              </ul>
              <p className="text-xs border-t border-border/50 pt-3">
                Indexers: watch <code className="text-xs">ProposalCreated</code>, <code className="text-xs">ProposalQueued</code>,{" "}
                <code className="text-xs">ParameterUpdated</code>, <code className="text-xs">OracleSourceWhitelisted</code>,{" "}
                <code className="text-xs">ClassConfigUpdated</code>, <code className="text-xs">ProtocolRiskModeUpdated</code>,{" "}
                <code className="text-xs">OracleUpdatesPausedUpdated</code>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="outline-none space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/60 bg-card/80 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Delegation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Voting power" value="0 MACH (ERC20Votes)" />
            <InfoRow label="Delegated to" value="Self" />
            <p className="text-xs text-muted-foreground pt-2">
              On-chain governor uses OpenZeppelin <code className="text-[10px] bg-muted px-1 rounded">ERC20Votes</code> (snapshots / delegation).
              MACH in <code className="text-[10px] bg-muted px-1 rounded">MACHStaking</code> sits in the staking contract — plan stake size vs voting needs. Demo values.
            </p>
            <Button type="button" variant="outline" className="rounded-full border-primary/40 w-full sm:w-auto">
              Set delegate
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Timelock</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Passed proposals queue here before execution. Critical parameter changes honor a delay for exit liquidity.
            </p>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Queue depth</p>
              <Progress value={33} className="h-2" />
              <p className="text-xs text-foreground mt-2 font-mono">1 action · ETA 18h (demo)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
          <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-card">
            Active proposals
          </TabsTrigger>
          <TabsTrigger value="archive" className="rounded-lg data-[state=active]:bg-card">
            Closed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="outline-none space-y-4">
          {active.length === 0 ? (
            <EmptyStateCard
              title="No active proposals"
              description="When risk or oracle changes are scheduled, they will appear here with quorum progress and timelock state."
            />
          ) : (
            active.map((p) => {
              const total = p.votesYes + p.votesNo + p.votesAbstain;
              const yesPct = total ? Math.round((p.votesYes / total) * 100) : 0;
              return (
                <Card key={p.proposalId} className="border-border/60 bg-card/85 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground font-mono items-center">
                      <span>{p.proposalId}</span>
                      <span className="uppercase text-primary font-semibold">{p.category}</span>
                      <span>Ends {formatRelativeIso(p.votingEnd)}</span>
                    </div>
                    <CardTitle className="text-lg font-display pt-1">{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>{p.description}</p>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Turnout / support</span>
                        <span className="text-foreground tabular-nums">{yesPct}% yes</span>
                      </div>
                      <Progress value={yesPct} className="h-2" />
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span>Quorum target {p.quorumBps / 100}%</span>
                      {p.riskImpact != null && (
                        <span className="uppercase text-amber-700 dark:text-amber-400">Risk: {p.riskImpact}</span>
                      )}
                      {p.chainScope != null && <span>Scope: {p.chainScope.replace(/_/g, " ")}</span>}
                      <span>Execution: {p.executionStatus}</span>
                      <span>Timelock: {p.timelockStatus}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="btn-gradient rounded-full text-primary-foreground border-0">
                        Vote yes
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full border-border">
                        Vote no
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="archive" className="outline-none space-y-4">
          {MOCK_GOVERNANCE_PROPOSALS.filter((p) => p.executionStatus === "executed").map((p) => (
            <Card key={p.proposalId} className="border-border/50 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>{p.description}</p>
                <p className="font-mono text-foreground">Executed · timelock {p.timelockStatus}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
        </TabsContent>
      </Tabs>
    </AppPage>
  );
};

export default Governance;
