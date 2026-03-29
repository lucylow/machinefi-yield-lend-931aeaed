// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IOracleRegistry
/// @notice Minimal read surface for governed oracle provider allowlists (§14.5).

interface IOracleRegistry {
    function isOracleProviderActive(address provider) external view returns (bool);
    function providerCount() external view returns (uint256);
    function minProvidersForConsensus() external view returns (uint256);
}
