# MachineFi Lending Pool — Smart Contracts

## Overview
These Solidity contracts implement the on-chain backend for the MachineFi Lending Pool:

| Contract | Description |
|---|---|
| `HardwareNFT.sol` | ERC-721 device registry: proof binding, EIP-712 oracle refresh, collateral binding, `riskAdjustedCollateralWad` |
| `DePINClassRegistry.sol` | §6.2 class risk params (proof windows, LTV hints, base collateral WAD) — implement `IDePINClassRegistry` for `LendingPool` |
| `DePINTypes.sol` | Shared enums for settlement layer / device class documentation |
| `YieldToken.sol` | ERC-20 representing tokenized future yield from hardware |
| `YieldTokenFactory.sol` | Factory to deploy YieldToken instances per position |
| `LendingPool.sol` | Core lending: class-based origination/verification fees, borrower/lender APR spread, liquidation fee routing |
| `RevenueRouter.sol` | Fee collection from pool; revenue-by-source accounting; split to LP, treasury, stakers, insurance, growth; conservative stress split; optional `TreasuryHub` |
| `TreasuryHub.sol` | Categorized treasury ledger (five buckets) with pull from router |
| `InsuranceReserve.sol` | Governance-drawn insurance / backstop vault |
| `MACHStaking.sol` | MACH escrow + `IFeeDiscountModule` origination tiers |
| `incentives/LiquidityEmissionController.sol` | Capped on-chain incentive budget accounting |
| `RevenueTypes.sol` | Shared `RevenueSource` enum for router and pool |
| `interfaces/IRevenueRouter.sol` | Router interface for `LendingPool` |
| `interfaces/IFeeDiscountModule.sol` | Optional origination discount hook for `LendingPool` |
| `interfaces/ITreasuryHub.sol` | Treasury pull interface for `RevenueRouter` |
| `LendingPoolRWA.sol` | RWA-specific lending pool with multi-collateral support |
| `RWAAsset.sol` | ERC-721 for real-world assets (real estate, invoices, commodities) |
| `YieldVault.sol` | Tracks projected vs realized yield with streaming updates & partial collateral unlocking |
| `OracleManager.sol` | Multi-provider oracle aggregation with anomaly detection & consensus |
| `LiquidationEngine.sol` | Partial + full liquidation engine with keeper roles & yield underperformance triggers |
| `Treasury.sol` | Protocol treasury controlled by governance timelock |
| `MACH.sol` | Governance token (`ERC20Votes` checkpoints / delegation) |
| `MachineFiGovernor.sol` | Timelock-backed OZ Governor: quorum fraction, optional trusted execution targets |
| `governance/MachineFiTimelock.sol` | OZ `TimelockController` wrapper (local artifact for deploy/tests) |
| `governance/ProtocolParameterRegistry.sol` | Bounded, chain-scoped parameter keys + events for indexers |
| `interfaces/IProtocolParameterRegistry.sol` | Parameter registry read API |
| `interfaces/IOracleRegistry.sol` | Oracle whitelist read API (`OracleManager`) |
| `interfaces/IEmergencyControls.sol` | Pool risk mode + oracle pause reads for dashboards |

## Architecture

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│ HardwareNFT  │────▶│  YieldVault   │────▶│   LendingPool    │
│ (Device Reg) │     │ (Yield Track) │     │ (Borrow/Repay)   │
└──────────────┘     └───────────────┘     └──────────────────┘
       │                     ▲                       │
       │              ┌──────┴──────┐         ┌──────┴──────┐
       │              │OracleManager│         │Liquidation  │
       │              │(Multi-feed) │         │Engine       │
       │              └─────────────┘         │(Partial/Full│
       │                                      └─────────────┘
       ▼
┌──────────────┐
│ YieldToken   │◀── YieldTokenFactory
│ (Collateral) │
└──────────────┘
```

## Key Features

### YieldVault
- Streaming yield accrual (per-second rate)
- Projected vs realized yield tracking
- Partial collateral unlocking when yield exceeds 50% of projection

### OracleManager
- Multi-provider oracle submissions with consensus
- Anomaly detection (>20% deviation, >50% sudden drops)
- Data freshness checks (1-hour staleness window)

### LiquidationEngine
- **Partial liquidation** at 75% LTV (liquidates 50% of debt)
- **Full liquidation** at 90% LTV (seizes NFT collateral)
- 5% liquidation bonus for keepers
- Liquidation history tracking

## Compilation & Deployment
These contracts are **not compiled by Lovable**. Use Hardhat or Foundry:

```bash
# With Hardhat
npx hardhat compile
npx hardhat deploy --network bscTestnet

# With Foundry
forge build
forge create --rpc-url $BSC_TESTNET_RPC ...
```

## Dependencies
- OpenZeppelin Contracts v4.x (`@openzeppelin/contracts`)

## Network Config
- **BSC Testnet**: chainId 97, RPC `https://data-seed-prebsc-1-s1.binance.org:8545/`
- **BSC Mainnet**: chainId 56, RPC `https://bsc-dataseed.binance.org/`
- **opBNB** (L2): Used for high-frequency yield tracking

## After Deployment
Update `src/constants/addresses.ts` with deployed contract addresses.

### RevenueRouter + LendingPool
1. Deploy `RevenueRouter` with the pool stablecoin and five recipient addresses (LP sink, treasury, staker distributor, insurance vault, growth multisig).  
2. `grantRole(FEE_REPORTER_ROLE, lendingPoolAddress)` on the router.  
3. From governance, call `LendingPool.setRevenueRouter(routerAddress)` so the pool approves the router to pull fee amounts.  
4. Optional: deploy `TreasuryHub(asset, admin, router)`, `router.setTreasuryHub(hub)`, grant `ROUTER_ROLE` on hub to router if not set in hub constructor.  
5. Optional: deploy `MACHStaking` + `LendingPool.setFeeDiscountModule(staking)`.  
6. Tune `setClassFees`, `setAllocation`, `setStressAllocation`, `setConservativeRevenueMode`, and `setRecipients` on the router (subject to on-chain floors/caps).

### DePIN registry + lending hooks (BSC canonical)
1. Deploy `DePINClassRegistry(admin)` then `HardwareNFT.setClassRegistry(registry)` and `LendingPool.setClassRegistry(registry)` (same address) so proof windows / base collateral / LTV hints align.  
2. `HardwareNFT.setLendingPool(pool)` auto-whitelists the pool for `onCollateralBond` / `onCollateralRelease`. For `DePINCreditLine`, also call `HardwareNFT.setCollateralProtocol(creditLineAddress, true)`.  
3. Collateral value on borrow and for LTV updates uses `HardwareNFT.riskAdjustedCollateralWad` (class base × confidence × registry weights × fresh proof).

**Breaking change (LendingPool):** The single global `interestRate` and `accruedInterest` field are replaced by **per-class borrower/lender APR** and split accrual (`accruedLpInterest` + `accruedProtocolInterest`). Off-chain indexers and ABIs must be updated. `getPositionFull` still returns total accrued interest as the second value for borrower repayment quotes.
