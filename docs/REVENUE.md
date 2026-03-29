# Protocol revenue model

MachineFi Lending Pool is designed as a **BNB Chain–native lending protocol** with explicit, governance-controlled monetization. Fees are visible in product copy, routed on-chain through `RevenueRouter`, and attributed by source for analytics.

## Revenue streams (mapped to activity)

| Stream | Trigger | On-chain / metered |
|--------|---------|-------------------|
| Origination | New borrow position | `LendingPool.deposit` → `RevenueRouter.routeFee(Origination, …)` |
| Interest spread | Interest accrual over time | `LendingPool.repay` → `routeFee(InterestSpread, protocolPortion)` |
| Liquidation | Resolved liquidatable position | `LendingPool.liquidate` → `routeFee(Liquidation, …)` |
| Verification | Draw against attested device | `deposit` → `routeFee(Verification, …)` |
| Treasury yield | Idle reserves / POL | Off-chain strategy + optional `TreasuryYield` attribution |
| B2B / API | Dashboards, indexed insights, partner tiers | Metered billing (Supabase / billing provider) |

There is **no** generic “marketing monetization” — each line item ties to a measurable protocol or contract action.

## Fee parameters

### Per device class (`LendingPool.ClassFees`)

- `originationFeeBps`, `verificationFeeBps` — upfront from principal; borrower still owes full principal; wallet receives `principal − fees`.
- `borrowerAprBps`, `lenderAprBps` — borrower pays the higher rate; LPs earn the lower rate; the **spread** is protocol revenue on repay.
- `liquidationFeeBps` — small fee on total owed at execution, routed to reserves / keepers via the router (capped by liquidator payment).

Defaults differ for **Helium**, **Hivemapper**, **Tesla**, and **Custom** to reflect risk and proof cadence.

### Global routing (`RevenueRouter`)

After fees hit the router, governance sets a five-way split (basis points, sum 10_000):

1. Liquidity providers  
2. Protocol treasury  
3. MACH stakers  
4. Insurance reserve  
5. Growth fund  

Treasury **bucket** labels (protocol revenue, reserve capital, operational, incentives, insurance backstop) are reporting weights on the treasury share, not a second token transfer.

## MACH utility (value from usage)

- **Governance**: risk and fee parameters (`setClassFees`, `setAllocation`, recipients).  
- **Staking**: fee discount on **origination** (UI + policy; on-chain hook can read stake module).  
- **Fee share**: staker recipient address receives a slice of every routed fee.  

MACH is **not** defined as pure emissions; narrative and contracts tie it to routed revenue.

## Governance guardrails

Governance may adjust fee rates, routing bps, device-class schedules, reserve targets, and partner/API pricing **within bounded parameters**. It must **not** be used to arbitrarily seize user collateral from core lending custody — business levers are fee and risk parameters, not borrower NFT withdrawal.

## Frontend surfaces

- **Borrow flow**: “You receive”, protocol fees, borrower vs lender APR, spread explanation, liquidation fee preview, MACH discount, premium tier.  
- **`/protocol/revenue`**: treasury flywheel, revenue-by-source charts, routing table, B2B tier list.  
- **Governance → Fee policy**: same knobs in vote-oriented context.

## Tests

`npm test` runs Vitest, including `src/lib/feeMath.test.ts` for fee math and routing-related quote logic.

`npm run test:contracts` runs Hardhat tests including `hardhat-tests/tokenomics.test.js` (§13 revenue, treasury hub, insurance, MACH staking discount).

## Related

- **[TOKENOMICS.md](./TOKENOMICS.md)** — Section 13 mapping (MACH utility, stress routing, treasury categories, insurance, sustainability).

## Deployment checklist

1. Deploy `RevenueRouter` with stablecoin asset and recipient addresses.  
2. Grant `FEE_REPORTER_ROLE` on `RevenueRouter` to the `LendingPool` address.  
3. Call `LendingPool.setRevenueRouter(router)` from governance (sets unlimited allowance for pulls).  
4. Verify `classFees` defaults or run `setClassFees` per environment.  

Legacy `Treasury.sol` remains the timelock-controlled vault; **router recipients** may include the treasury multisig or staker vault as deployed.
