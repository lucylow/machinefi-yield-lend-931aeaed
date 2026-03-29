// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IComplianceHook
 * @notice Optional modular gate for borrow / proof flows. Core pools keep `address(0)` to stay permissionless.
 *         Institutional or jurisdiction-aware modules implement this without changing core lending math.
 */
interface IComplianceHook {
    /// @notice Whether a borrower may open a new position for `nftId` (retail path).
    function canOpenPosition(uint256 nftId, address borrower) external view returns (bool ok, bytes32 reasonCode);

    /// @notice Whether `account` may refresh on-chain proof metadata for `nftId`.
    function canRefreshProof(uint256 nftId, address account) external view returns (bool ok, bytes32 reasonCode);
}
