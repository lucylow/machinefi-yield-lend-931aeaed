// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Minimal surface for BSC settlement pool updates from oracle bridge contracts.
interface ILendingPoolBnb {
    function updateCollateralValue(uint256 nftId, uint256 newCollateral) external;

    function batchUpdateCollateralValueFromOracle(uint256[] calldata nftIds, uint256[] calldata newCollaterals) external;

    function getPosition(uint256 nftId)
        external
        view
        returns (uint256 debt, uint256 collateralValue, uint256 ltv, uint256 yieldPercentage, address yieldToken);
}
