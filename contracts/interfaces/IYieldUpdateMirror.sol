// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../DePINTypes.sol";

/// @title IYieldUpdateMirror
/// @notice BSC-facing view of opBNB epoch summaries + Greenfield proof anchors. LendingPool applies
///         `borrowSafetyBps` so stale or diverged update layers never increase borrowing power.

interface IYieldUpdateMirror {
    function borrowSafetyBps(uint256 nftId) external view returns (uint256);

    function isBorrowAllowed(uint256 nftId) external view returns (bool);

    function deviceSyncStatus(uint256 nftId) external view returns (ChainSyncStatus);

    function globalLayerStatus() external view returns (ChainSyncStatus);

    function lastMirroredEpoch(uint256 nftId) external view returns (uint32);

    function lastSnapshotHash(uint256 nftId) external view returns (bytes32);
}
