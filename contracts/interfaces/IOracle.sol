// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Oracle surface for RWA / device collateral priced in stable terms (WAD, 1e18 = 1 USD if stable is 18 decimals).
interface IOracle {
    /// @param nftId Hardware NFT (or RWA token id) used as collateral key.
    /// @return usdValue Collateral value in WAD (same base unit as vault debt).
    function getCollateralValue(uint256 nftId) external view returns (uint256 usdValue);
}
