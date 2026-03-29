// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title BNBChainIds
/// @notice Authoritative chain IDs for the layered BNB stack (settlement vs update). Used in
///         deployment scripts and opBNB tracker; BSC contracts may assert `block.chainid` at deploy time.

library BNBChainIds {
    uint256 internal constant BSC_MAINNET = 56;
    uint256 internal constant BSC_TESTNET = 97;
    uint256 internal constant OPBNB_MAINNET = 204;
    uint256 internal constant OPBNB_TESTNET = 5611;
}
