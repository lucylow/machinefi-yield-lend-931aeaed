// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BNBChainIds
 * @notice Canonical chain identifiers for BNB Smart Chain, opBNB, and testnets.
 *         Use these in bridges, oracle payloads, and replay guards instead of magic numbers.
 */
library BNBChainIds {
    uint64 internal constant BSC_MAINNET = 56;
    uint64 internal constant BSC_TESTNET = 97;
    uint64 internal constant OPBNB_MAINNET = 204;
    uint64 internal constant OPBNB_TESTNET = 5611;
    /// @notice BNB Greenfield mainnet (Cosmos stack; useful for off-chain coordinator config).
    uint64 internal constant GREENFIELD_MAINNET_CHAIN_ID = 1017;
}
