// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Pulls treasury tranche from `RevenueRouter` and earmarks by category for auditable accounting.
interface ITreasuryHub {
    function creditFromRouter(uint256 amount) external;
}
