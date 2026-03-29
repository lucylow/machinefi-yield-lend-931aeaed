// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../DePINTypes.sol";
import "../interfaces/IYieldUpdateMirror.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title YieldUpdateMirror
 * @notice Canonical BSC contract that ingests **aggregated** opBNB epoch summaries and Greenfield
 *         proof references. Raw telemetry stays off settlement; this mirror stores hashes, epochs,
 *         and conservative `borrowSafetyBps` for `LendingPool` (§15.3–15.5).
 */
contract YieldUpdateMirror is IYieldUpdateMirror, AccessControl {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    /// @dev Global health of the update layer as seen by the settlement relayer.
    ChainSyncStatus public layerStatus;

    /// @dev Monotonic epoch finalized on the update side (relayer increments on `finalizeUpdateEpoch`).
    uint32 public globalEpoch;

    struct DeviceMirror {
        uint64 lastSyncedAt;
        uint32 updateEpoch;
        ChainSyncStatus syncStatus;
        SnapshotLifecycle snapshotLife;
        uint16 borrowSafetyBps;
        uint16 missedHeartbeats;
        bytes32 lastSnapshotHash;
        bytes32 greenfieldObjectKey;
        bytes32 metadataHash;
        uint64 storageAnchoredAt;
        uint64 lastValidatedAt;
    }

    mapping(uint256 => DeviceMirror) internal _device;

    error ZeroHash();
    error ZeroNft();
    error EpochNotAdvanced();

    event YieldSnapshotSubmitted(
        uint256 indexed nftId,
        uint32 indexed epochId,
        bytes32 snapshotHash,
        uint16 borrowSafetyBps,
        ChainSyncStatus syncStatus,
        SnapshotLifecycle life
    );
    event ProofObjectAnchored(
        uint256 indexed nftId,
        bytes32 greenfieldObjectKey,
        bytes32 metadataHash,
        uint64 storageAnchoredAt
    );
    event EpochFinalized(uint32 indexed epochId, uint256 timestamp);
    event EpochSyncedToBSC(uint256 indexed nftId, uint32 indexed epochId, bytes32 snapshotHash);
    event GreenfieldReferenceUpdated(uint256 indexed nftId, bytes32 greenfieldObjectKey, bytes32 metadataHash);
    event ChainSyncStatusChanged(ChainSyncStatus previous, ChainSyncStatus next);
    event UpdateLayerStale(uint256 indexed nftId, ChainSyncStatus status, uint16 missedHeartbeats);
    event SnapshotRejected(uint256 indexed nftId, bytes32 snapshotHash, string reason);
    event SyncRecovered(uint256 indexed nftId, ChainSyncStatus status);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroNft();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNOR_ROLE, admin);
        _grantRole(RELAYER_ROLE, admin);
        layerStatus = ChainSyncStatus.Synced;
    }

    /// @inheritdoc IYieldUpdateMirror
    function borrowSafetyBps(uint256 nftId) public view override returns (uint256) {
        ChainSyncStatus g = layerStatus;
        if (g == ChainSyncStatus.Frozen) return 0;

        DeviceMirror storage d = _device[nftId];
        uint256 b = d.borrowSafetyBps;
        if (b == 0) b = 10_000;

        if (g == ChainSyncStatus.Diverged) return (b * 7000) / 10_000;
        if (g == ChainSyncStatus.Delayed) return (b * 8500) / 10_000;
        if (d.syncStatus == ChainSyncStatus.Stale) return (b * 7000) / 10_000;
        return b;
    }

    /// @inheritdoc IYieldUpdateMirror
    function isBorrowAllowed(uint256 nftId) external view override returns (bool) {
        if (layerStatus == ChainSyncStatus.Frozen) return false;
        if (_device[nftId].syncStatus == ChainSyncStatus.Frozen) return false;
        return borrowSafetyBps(nftId) > 0;
    }

    /// @inheritdoc IYieldUpdateMirror
    function deviceSyncStatus(uint256 nftId) external view override returns (ChainSyncStatus) {
        return _device[nftId].syncStatus;
    }

    /// @inheritdoc IYieldUpdateMirror
    function globalLayerStatus() external view override returns (ChainSyncStatus) {
        return layerStatus;
    }

    /// @inheritdoc IYieldUpdateMirror
    function lastMirroredEpoch(uint256 nftId) external view override returns (uint32) {
        return _device[nftId].updateEpoch;
    }

    /// @inheritdoc IYieldUpdateMirror
    function lastSnapshotHash(uint256 nftId) external view override returns (bytes32) {
        return _device[nftId].lastSnapshotHash;
    }

    function getDeviceMirror(uint256 nftId) external view returns (DeviceMirror memory) {
        return _device[nftId];
    }

    // --- Governance ---

    function setGlobalLayerStatus(ChainSyncStatus next) external onlyRole(GOVERNOR_ROLE) {
        ChainSyncStatus prev = layerStatus;
        layerStatus = next;
        emit ChainSyncStatusChanged(prev, next);
    }

    /// @notice Mark update layer unhealthy (e.g. opBNB outage). Borrowing becomes conservative or blocked.
    function markUpdateLayerStale() external onlyRole(GOVERNOR_ROLE) {
        ChainSyncStatus prev = layerStatus;
        layerStatus = ChainSyncStatus.Stale;
        emit ChainSyncStatusChanged(prev, layerStatus);
        emit UpdateLayerStale(0, layerStatus, 0);
    }

    function restoreLayerHealth() external onlyRole(GOVERNOR_ROLE) {
        ChainSyncStatus prev = layerStatus;
        layerStatus = ChainSyncStatus.Synced;
        emit ChainSyncStatusChanged(prev, layerStatus);
    }

    /// @notice Finalize an epoch on the relayer path after opBNB aggregation.
    function finalizeUpdateEpoch(uint32 epochId) external onlyRole(RELAYER_ROLE) {
        if (epochId < globalEpoch) revert EpochNotAdvanced();
        globalEpoch = epochId;
        emit EpochFinalized(epochId, block.timestamp);
    }

    /**
     * @notice Primary mirror entry: snapshot hash commits to off-chain payload (yields, telemetry digest).
     * @param borrowSafetyBps_ Conservative multiplier (10000 = full); relayer must not raise above last good without validation.
     */
    function submitYieldSnapshot(
        uint256 nftId,
        uint32 epochId,
        bytes32 snapshotHash,
        uint16 borrowSafetyBps_,
        ChainSyncStatus syncStatus_,
        SnapshotLifecycle life,
        bytes32 greenfieldObjectKey,
        bytes32 metadataHash_
    ) external onlyRole(RELAYER_ROLE) {
        _submitYieldSnapshot(
            nftId,
            epochId,
            snapshotHash,
            borrowSafetyBps_,
            syncStatus_,
            life,
            greenfieldObjectKey,
            metadataHash_
        );
    }

    function _submitYieldSnapshot(
        uint256 nftId,
        uint32 epochId,
        bytes32 snapshotHash,
        uint16 borrowSafetyBps_,
        ChainSyncStatus syncStatus_,
        SnapshotLifecycle life,
        bytes32 greenfieldObjectKey,
        bytes32 metadataHash_
    ) internal {
        if (nftId == 0) revert ZeroNft();
        if (snapshotHash == bytes32(0)) revert ZeroHash();

        DeviceMirror storage d = _device[nftId];
        if (epochId > d.updateEpoch) {
            d.updateEpoch = epochId;
        } else if (epochId < d.updateEpoch) {
            emit SnapshotRejected(nftId, snapshotHash, "epoch_regressed");
            return;
        }

        d.lastSyncedAt = uint64(block.timestamp);
        d.syncStatus = syncStatus_;
        d.snapshotLife = life;
        if (borrowSafetyBps_ > 0 && borrowSafetyBps_ <= 10_000) {
            if (d.borrowSafetyBps == 0 || borrowSafetyBps_ <= d.borrowSafetyBps) {
                d.borrowSafetyBps = borrowSafetyBps_;
            }
        }
        d.lastSnapshotHash = snapshotHash;
        if (greenfieldObjectKey != bytes32(0)) {
            d.greenfieldObjectKey = greenfieldObjectKey;
            d.storageAnchoredAt = uint64(block.timestamp);
            emit GreenfieldReferenceUpdated(nftId, greenfieldObjectKey, metadataHash_);
        }
        if (metadataHash_ != bytes32(0)) {
            d.metadataHash = metadataHash_;
        }
        d.lastValidatedAt = uint64(block.timestamp);

        emit YieldSnapshotSubmitted(nftId, epochId, snapshotHash, d.borrowSafetyBps, syncStatus_, life);
        emit EpochSyncedToBSC(nftId, epochId, snapshotHash);
        if (greenfieldObjectKey != bytes32(0)) {
            emit ProofObjectAnchored(nftId, greenfieldObjectKey, metadataHash_, d.storageAnchoredAt);
        }
    }

    /// @notice Cheap heartbeat counter for missed-update detection (relayer increments on opBNB pulse).
    function submitProofHeartbeat(uint256 nftId, uint32 epochId, uint16 missedHeartbeats_) external onlyRole(RELAYER_ROLE) {
        if (nftId == 0) revert ZeroNft();
        DeviceMirror storage d = _device[nftId];
        if (epochId >= d.updateEpoch) {
            d.updateEpoch = epochId;
        }
        d.missedHeartbeats = missedHeartbeats_;
        d.lastSyncedAt = uint64(block.timestamp);
        if (missedHeartbeats_ > 3) {
            d.syncStatus = ChainSyncStatus.Stale;
            emit UpdateLayerStale(nftId, d.syncStatus, missedHeartbeats_);
        }
    }

    struct MirrorBatchItem {
        uint256 nftId;
        uint32 epochId;
        bytes32 snapshotHash;
        uint16 borrowSafetyBps;
        ChainSyncStatus syncStatus;
        SnapshotLifecycle life;
        bytes32 greenfieldObjectKey;
        bytes32 metadataHash;
    }

    /// @notice Batch mirror for gas-efficient settlement updates (§15.8).
    function mirrorToSettlementLayer(MirrorBatchItem[] calldata batch) external onlyRole(RELAYER_ROLE) {
        uint256 n = batch.length;
        for (uint256 i; i < n; ) {
            MirrorBatchItem calldata it = batch[i];
            _submitYieldSnapshot(
                it.nftId,
                it.epochId,
                it.snapshotHash,
                it.borrowSafetyBps,
                it.syncStatus,
                it.life,
                it.greenfieldObjectKey,
                it.metadataHash
            );
            unchecked {
                ++i;
            }
        }
    }

    function markStale(uint256 nftId) external onlyRole(GOVERNOR_ROLE) {
        DeviceMirror storage d = _device[nftId];
        d.syncStatus = ChainSyncStatus.Stale;
        d.snapshotLife = SnapshotLifecycle.Stale;
        emit UpdateLayerStale(nftId, d.syncStatus, d.missedHeartbeats);
    }

    function restoreFreshness(uint256 nftId) external onlyRole(RELAYER_ROLE) {
        DeviceMirror storage d = _device[nftId];
        d.syncStatus = ChainSyncStatus.Synced;
        d.snapshotLife = SnapshotLifecycle.Mirrored;
        d.missedHeartbeats = 0;
        emit SyncRecovered(nftId, d.syncStatus);
    }
}
