// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Optional module read by `LendingPool` to reduce origination fee (bps off base class rate only).
interface IFeeDiscountModule {
    /// @return discountBps reduction applied to `ClassFees.originationFeeBps` (not verification fee).
    function originationDiscountBps(address borrower) external view returns (uint16);
}
