// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IProtocolParameterRegistry
/// @notice Cross-module, indexer-friendly view of governed scalar parameters (§14.4 / §22).
///         Authoritative enforcement remains on consumer contracts; this registry is the auditable control-plane mirror.

interface IProtocolParameterRegistry {
    enum ChainLayer {
        Unspecified,
        BscSettlement,
        OpbnbUpdate,
        GreenfieldStorage,
        CrossLayer
    }

    function uintParam(bytes32 key) external view returns (uint256);
}
