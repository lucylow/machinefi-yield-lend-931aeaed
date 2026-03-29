# Section 13 — Tokenomics and incentives (on-chain alignment)

This document maps the whitepaper economics to **auditable contracts and events** on BNB Chain (BSC settlement; opBNB / Greenfield for proofs — see stack docs).

## 13.1 MACH utility and governance role

| Function | On-chain | Notes |
|----------|----------|--------|
| Governance voting | `MACH` (`ERC20Votes`) + `MachineFiGovernor` | Voting power is **token-weighted** (snapshots / delegation per OZ Governor). |
| Staking / alignment | `MACHStaking` | Escrows MACH; implements `IFeeDiscountModule` for **origination fee** discounts only. |
| Fee utility | `LendingPool` + `feeDiscountModule` | Governance sets the module address; pool caps discount via `MAX_ORIGINATION_DISCOUNT_BPS`. |
| Revenue share (stakers) | `RevenueRouter` → `stakerRecipient` | A fixed **share of routed fees** goes to the configured staker vault — not an automatic buyback. |

**What MACH does *not* do:** It is **not** loan collateral. Holding or staking MACH does **not** change LTV, liquidation threshold, or oracle marks — those come from `HardwareNFT`, class registry, and pool risk mode.

**Governance / staking tradeoff:** Staked MACH sits in `MACHStaking`. Voting weight follows **where the tokens live** unless governance later adds delegation or wrapper patterns. Operators should size stake vs voting needs explicitly.

## 13.2 Fee model

Fees are **explicit** at the pool:

- **Origination** and **verification**: deducted from disbursed principal on `deposit`; emitted as `FeeCharged` then routed.
- **Interest spread**: borrower APR minus lender APR accrues as protocol interest; routed on `repay` via `FeeCharged` + `routeFee(InterestSpread, …)`.
- **Liquidation**: protocol fee capped by liquidator payment; `FeeCharged` + `routeFee(Liquidation, …)`.

**Preview:** `LendingPool.previewOpenPositionFees(nftId, borrowAmount, borrower)` mirrors `deposit` fee math (no collateral / liquidity checks).

## 13.3 Protocol revenue distribution

`RevenueRouter.routeFee`:

1. Pulls stablecoin from the `FEE_REPORTER` (the pool).
2. Updates `revenueBySource[src]`.
3. Splits by **basis points** into: LP recipient, treasury (or `TreasuryHub`), stakers, insurance, growth.

**Stress mode:** `conservativeRevenueMode` switches to `stressAllocation` (higher LP + insurance floors enforced at set time).

**Bounds (normal mode):** Governance cannot set LP below `MIN_LP_BPS_NORMAL`, insurance below `MIN_INSURANCE_BPS_NORMAL`, or growth above `MAX_GROWTH_BPS_NORMAL`.

**Events:** `FeeRouted`, `FeeDistributed` (duplicate payload for indexers), `FeeParameterUpdated`, `FeeRouteUpdated`, `ConservativeRevenueModeUpdated`.

## 13.4 Treasury allocation

When `treasuryHub != address(0)`, the treasury tranche is **pulled** into `TreasuryHub`, which credits five **internal categories** using `TreasuryBucketBps` (must sum to 10_000):

- Protocol revenue  
- Reserve capital  
- Operational  
- Incentives  
- Insurance backstop  

Withdrawals are `EXECUTOR_ROLE` (timelock) with `TreasuryWithdrawal` / `TreasurySpendingApproved` events.

Legacy `Treasury.sol` remains a simple executor vault for native/ERC20 transfers.

## 13.5 Insurance and reserve design

`InsuranceReserve` holds the stablecoin, accepts public `fund`, and allows governance `coverShortfall(to, amount, reason)` with hashed reason in events. Optional `reserveFloor` emits `ReserveBelowFloor` when breached after a draw.

This is a **governance-drawn backstop**, not automatic liquidation insurance.

## 13.6 Staking and governance incentives

`MACHStaking` uses **balance tiers** (2_500 / 10_000 / 50_000 MACH) for 5 / 10 / 15 bps origination discounts (subject to pool cap). Rewards are **not** promised by the staking contract itself; long-term alignment is **fee routing to stakerRecipient** + governance.

## 13.7 Liquidity incentive model

`LiquidityEmissionController` records a **global emission budget** and `recordIncentive` consumption for capped, observable incentive spend (actual token distribution lives in integrator contracts / ops).

## 13.8 Sustainability

- Revenue-first narrative: spreads and fees route before discretionary growth.  
- Normal vs stress splits are **governance-visible**.  
- Growth tranche is **capped** in normal mode.  
- Token burns (if used) are **`BURNER_ROLE` only** on `MACH` — bounded and explicit.

## Revenue priority (policy)

Off-chain policy recommended for governance votes:

1. Protocol safety (LP solvency, accurate marks)  
2. Lender obligations  
3. Insurance / reserve funding  
4. Treasury runway  
5. Staker routing  
6. Discretionary incentives last  

The router enforces **minimum** LP/insurance shares in normal mode; it does not automatically reorder every leg — timelock governance must respect the policy above.

## Tests

`npm run test:contracts` includes `hardhat-tests/tokenomics.test.js` for router splits, treasury hub, insurance reserve, staking discount + preview, and emission cap.
