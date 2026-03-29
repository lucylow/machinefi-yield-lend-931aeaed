import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DappLayout from '@/components/dapp/DappLayout';
import { Vote, Users, Landmark, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

const DAOCodePage = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DappLayout>
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MachineFi DAO</h1>
            <p className="text-muted-foreground mt-1">
              Decentralized Governance for the MachineFi Lending Pool
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Users size={16} />
              Delegate Votes
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600">
              <Vote size={16} />
              Create Proposal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card shadow-lg bg-white/50 dark:bg-black/20 backdrop-blur-xl border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                <span>MACH Token Price</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Live</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$1.24</div>
              <p className="text-xs text-green-500 mt-1 font-medium flex items-center">
                +5.2% from last week
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-lg bg-white/50 dark:bg-black/20 backdrop-blur-xl border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                <span>Treasury Balance</span>
                <Landmark size={16} className="text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$1.45M</div>
              <p className="text-xs text-muted-foreground mt-1">
                Yield generated from Lending pool
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-lg bg-white/50 dark:bg-black/20 backdrop-blur-xl border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
                <span>Your Voting Power</span>
                <ShieldCheck size={16} className="text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12,500 <span className="text-lg text-muted-foreground">MACH</span></div>
              <p className="text-xs text-muted-foreground mt-1">
                Self delegated • 0.05% of total Supply
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="proposals" className="w-full mt-8" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="proposals">Active Proposals</TabsTrigger>
            <TabsTrigger value="system">DAO Architecture</TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="space-y-4 mt-6">
            <h2 className="text-xl font-semibold mb-4">Recent Proposals</h2>
            
            {/* Mock Proposal 1 */}
            <Card className="overflow-hidden border-indigo-100 hover:border-indigo-300 transition-colors shadow-sm cursor-pointer group">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Active</Badge>
                        <span className="text-xs text-muted-foreground font-mono">MIP-14</span>
                      </div>
                      <h3 className="text-lg font-bold group-hover:text-indigo-600 transition-colors">Adjust Base Interest Rate to 6.5%</h3>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      Ends in 2 days
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    This proposal seeks to lower the base borrowing interest rate from 8% to 6.5% to increase lending volume and stay competitive with other RWA protocols on BNB Chain.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-green-600">65% For</span>
                      <span className="font-medium text-red-600">35% Against</span>
                    </div>
                    <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 transition-all duration-500" style={{ width: '65%' }}></div>
                      <div className="h-full bg-red-500 transition-all duration-500" style={{ width: '35%' }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 text-right">
                      Quorum: 2.1M / 400k (Reached)
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center group-hover:bg-indigo-50/50 transition-colors">
                  <span className="text-sm font-medium text-indigo-600 flex items-center gap-1">
                    View Details <ArrowRight size={14} />
                  </span>
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 border border-white"></div>
                    <div className="w-6 h-6 rounded-full bg-indigo-100 border border-white"></div>
                    <div className="w-6 h-6 rounded-full bg-purple-100 border border-white"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mock Proposal 2 */}
            <Card className="overflow-hidden border-gray-200 opacity-75 shadow-sm">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Executed</Badge>
                        <span className="text-xs text-muted-foreground font-mono">MIP-13</span>
                      </div>
                      <h3 className="text-lg font-bold">Add Support for Hivemapper Dashcams</h3>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      Executed last week
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Whitelists Hivemapper hardware as valid collateral yielding verified DePIN rewards on the protocol.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  MachineFi Lending Pool DAO Smart Contracts
                </CardTitle>
                <CardDescription>
                  The protocol is governed by a decentralized system of smart contracts utilizing OpenZeppelin libraries on the BNB Chain.
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <div className="grid grid-cols-1 gap-6 mt-4">
                  
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold flex items-center gap-2 mt-0">
                      <div className="p-1.5 bg-blue-100 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-300">
                        <Vote size={16} />
                      </div>
                      MACH Token (Governance Token)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      An ERC20 token with voting extensions (ERC20Votes) enabling delegation and snapshot-based voting.
                    </p>
                    <pre className="text-xs overflow-x-auto p-4 bg-slate-950 text-slate-50 rounded-md">
                      <code>{`import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract MACH is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    // Allows token holders to delegate their voting power
    // Snapshots balances at specific blocks for proposals
}`}</code>
                    </pre>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold flex items-center gap-2 mt-0">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded dark:bg-indigo-900 dark:text-indigo-300">
                        <Landmark size={16} />
                      </div>
                      MachineFiGovernor & Timelock
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      The core voting mechanism handling proposal creation, quorum checking, and queueing operations with a mandatory 2-day delay via the TimelockController.
                    </p>
                    <pre className="text-xs overflow-x-auto p-4 bg-slate-950 text-slate-50 rounded-md">
                      <code>{`// Governor (OZ) + timelock executor
// GovernorVotesQuorumFraction: quorum = supply * numerator / 100 at snapshot
uint256 public votingDelay = 7200;
uint256 public votingPeriod = 43200;
uint256 public proposalThreshold = 1000 * 1e18;
uint256 public quorumNumerator = 4; // 4% — updatable via governance

// Optional: enforce trusted contract targets for every proposal
bool public enforceProposalTargetAllowlist;`}</code>
                    </pre>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold flex items-center gap-2 mt-0">
                      <div className="p-1.5 bg-green-100 text-green-700 rounded dark:bg-green-900 dark:text-green-300">
                        <ShieldCheck size={16} />
                      </div>
                      LendingPool Integration
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Core pool parameters (oracle address, compliance hook, LTV cap, class registry, revenue router, risk
                      mode, oracle-update pause) use <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">GOVERNOR_ROLE</code>{" "}
                      — intended holder: <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">MachineFiTimelock</code>.{" "}
                      <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">PAUSER_ROLE</code> toggles global pause; repay stays available for exit liquidity.
                    </p>
                    <pre className="text-xs overflow-x-auto p-4 bg-slate-950 text-slate-50 rounded-md">
                      <code>{`contract LendingPool is AccessControl, Pausable {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    function setOracle(address o) external onlyRole(GOVERNOR_ROLE) { oracle = o; }
    function setMaxInitialLTV(uint256 bps) external onlyRole(GOVERNOR_ROLE) { ... }

    function repay(uint256 nftId) external nonReentrant {
        // not gated by whenNotPaused — borrowers can unwind when paused
    }
}`}</code>
                    </pre>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DappLayout>
  );
};

export default DAOCodePage;
