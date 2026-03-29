// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Shared revenue source labels for RevenueRouter and LendingPool.
enum RevenueSource {
    Origination,
    InterestSpread,
    Liquidation,
    Verification,
    B2B,
    TreasuryYield,
    LateFee
}
