// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OpBNBYieldTracker
 * @notice Deploy on **opBNB** for high-frequency yield snapshots, heartbeats, and epoch aggregation.
 *         A relayer reads events and calls `YieldUpdateMirror` on BSC (`mirrorToSettlementLayer`).
 *         This contract is intentionally storage-light: hashes and counters on L2, evidence in Greenfield.
 */
contract OpBNBYieldTracker is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant SEQUENCER_ROLE = keccak256("SEQUENCER_ROLE");

    uint32 public activeOpenEpoch;
    uint32 public finalizedEpoch;

    struct Snapshot {
        uint256 yieldEstimateWad;
        uint256 realizedYieldWad;
        uint8 proofFreshnessBps;
        uint8 confidenceScore;
        uint64 observedAt;
        bytes32 storageRef;
        bytes32 hashCommitment;
    }

    mapping(uint32 => mapping(uint256 => Snapshot)) private _epochSnapshots;
    mapping(uint256 => uint32) public lastDeviceEpoch;

    event YieldSnapshotSubmitted(
        uint256 indexed deviceKey,
        uint32 indexed epochId,
        uint256 yieldEstimateWad,
        uint256 realizedYieldWad,
        uint8 proofFreshnessBps,
        uint8 confidenceScore,
        uint64 observedAt,
        bytes32 storageRef,
        bytes32 hashCommitment
    );
    event ProofHeartbeat(uint256 indexed deviceKey, uint32 indexed epochId, uint64 timestamp);
    event EpochOpened(uint32 indexed epochId, uint256 timestamp);
    event EpochFinalized(uint32 indexed epochId, bytes32 aggregateHash, uint256 timestamp);
    event SnapshotRejected(uint256 indexed deviceKey, uint32 indexed epochId, string reason);

    error WrongChain();
    error EpochClosed();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(SEQUENCER_ROLE, admin);
    }

    /// @dev Optional guard: set `enforceChainId` to expected opBNB id in production.
    uint256 public enforceChainId;
    bool public chainEnforcement;

    function setChainEnforcement(bool on, uint256 expectedChainId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        chainEnforcement = on;
        enforceChainId = expectedChainId;
    }

    function _assertChain() internal view {
        if (!chainEnforcement) return;
        if (block.chainid != enforceChainId) revert WrongChain();
    }

    function beginOpenEpoch(uint32 epochId) external onlyRole(SEQUENCER_ROLE) {
        _assertChain();
        activeOpenEpoch = epochId;
        emit EpochOpened(epochId, block.timestamp);
    }

    /// @param deviceKey Usually the BSC `HardwareNFT` tokenId carried in the cross-chain payload.
    function submitYieldSnapshot(
        uint256 deviceKey,
        uint32 epochId,
        uint256 yieldEstimateWad,
        uint256 realizedYieldWad,
        uint8 proofFreshnessBps,
        uint8 confidenceScore,
        uint64 observedAt,
        bytes32 storageRef,
        bytes32 hashCommitment
    ) external onlyRole(OPERATOR_ROLE) {
        _assertChain();
        if (epochId != activeOpenEpoch) revert EpochClosed();
        if (hashCommitment == bytes32(0)) {
            emit SnapshotRejected(deviceKey, epochId, "zero_commitment");
            return;
        }

        _epochSnapshots[epochId][deviceKey] = Snapshot({
            yieldEstimateWad: yieldEstimateWad,
            realizedYieldWad: realizedYieldWad,
            proofFreshnessBps: proofFreshnessBps,
            confidenceScore: confidenceScore,
            observedAt: observedAt,
            storageRef: storageRef,
            hashCommitment: hashCommitment
        });
        lastDeviceEpoch[deviceKey] = epochId;

        emit YieldSnapshotSubmitted(
            deviceKey,
            epochId,
            yieldEstimateWad,
            realizedYieldWad,
            proofFreshnessBps,
            confidenceScore,
            observedAt,
            storageRef,
            hashCommitment
        );
    }

    function submitProofHeartbeat(uint256 deviceKey, uint32 epochId) external onlyRole(OPERATOR_ROLE) {
        _assertChain();
        emit ProofHeartbeat(deviceKey, epochId, uint64(block.timestamp));
    }

    function finalizeUpdateEpoch(uint32 epochId, bytes32 aggregateHash) external onlyRole(SEQUENCER_ROLE) {
        _assertChain();
        if (epochId != activeOpenEpoch) revert EpochClosed();
        finalizedEpoch = epochId;
        emit EpochFinalized(epochId, aggregateHash, block.timestamp);
    }

    function getSnapshot(uint32 epochId, uint256 deviceKey) external view returns (Snapshot memory) {
        return _epochSnapshots[epochId][deviceKey];
    }
}
